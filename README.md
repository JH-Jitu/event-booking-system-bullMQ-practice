# Event Booking System

A small event booking system where users book seats for events. The API accepts bookings instantly (`202 Accepted`) and processes them asynchronously through a Redis-backed queue, so the endpoint stays fast even when many bookings arrive at once. A React dashboard lists bookings, shows their live status, and lets you create new ones.

- **Backend:** NestJS (TypeScript), PostgreSQL, Redis + BullMQ
- **Frontend:** React (TypeScript), Vite, Tailwind CSS

## Project structure

```
event-booking-system/
├── docker-compose.yml                  # PostgreSQL + Redis
├── scripts/
│   └── concurrency-check.mjs           # overbooking demo (fires N concurrent bookings)
├── event-booking.postman_collection.json
├── backend/
│   └── src/
│       ├── events/                     # GET /events
│       ├── bookings/                   # POST/GET /bookings, BullMQ worker, unit tests
│       └── database/                   # data source, migrations, seed
└── frontend/
    └── src/
        ├── lib/api.ts                  # typed API client
        └── components/                 # form, filters, table, badge, toast
```

## Setup and run

Prerequisites: Node.js 20+, Docker.

**1. Start PostgreSQL and Redis** (from the repo root)

```bash
docker compose up -d
```

Postgres maps to host port `5432`, Redis to `6379`. If a port is taken on your machine, create a `.env` next to `docker-compose.yml` (compose reads it automatically) and mirror the change in `backend/.env`:

```bash
# .env at repo root — example: run Redis on 6380 instead
REDIS_PORT=6380
```

**2. Backend** (from `backend/`)

```bash
cp .env.example .env      # defaults match docker-compose
npm install
npm run migration:run     # creates tables
npm run seed              # inserts 3 sample events
npm run start:dev         # API + worker on http://localhost:3000
```

**3. Frontend** (from `frontend/`, in a second terminal)

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm install
npm run dev               # dashboard on http://localhost:5173
```

**4. Tests** (from `backend/`)

```bash
npm test
```

**5. Optional: concurrency demo** (from the repo root, with the API running)

Fires 10 concurrent 1-seat bookings at the 5-seat "Exclusive Wine Tasting" event (eventId 3 from the seed) and asserts that confirmed bookings never exceed the seats that were available:

```bash
node scripts/concurrency-check.mjs 3 10
```

A Postman collection (`event-booking.postman_collection.json`) with assertions for every endpoint, the idempotency flow, and validation errors is included at the root.

## API

| Method | Path        | Description                                                           |
| ------ | ----------- | --------------------------------------------------------------------- |
| GET    | `/events`   | Events with remaining seat counts                                     |
| POST   | `/bookings` | Accepts a booking, returns `202` + booking reference immediately      |
| GET    | `/bookings` | Paginated list; filters: `?eventId=`, `?status=`, `?page=`, `?limit=` |

```json
POST /bookings
{
  "requestId": "7f3c2a10-9b1e-4d5a-8c6f-booking-001",
  "eventId": 1,
  "customerName": "Rahim Uddin",
  "customerEmail": "rahim@example.com",
  "seats": 2
}
```

The response is `202 Accepted` with the booking reference and `PENDING` status. The queue worker then confirms or fails the booking; poll `GET /bookings` to see the outcome (the dashboard does this automatically every 3 seconds).

## Key design decisions

### Asynchronous processing

`POST /bookings` only validates the payload, checks the event exists, inserts a `PENDING` row, and enqueues a BullMQ job — no seat math on the request path. The worker (a BullMQ processor inside the same Nest process) does the real work inside a single transaction: deduct seats and mark the booking `CONFIRMED`, or mark it `FAILED` with a reason.

Jobs retry up to 3 times with exponential backoff, but only for unexpected errors (e.g. a dropped DB connection). Business outcomes like "sold out" complete the job normally with a `FAILED` booking status — retrying those would never succeed, so the worker never throws for them.

### How overbooking is prevented

Seat deduction is a single conditional `UPDATE` — the check and the deduction are one atomic statement:

```sql
UPDATE events
SET    available_seats = available_seats - $seats
WHERE  id = $eventId AND available_seats >= $seats
```

When two workers race for the last seats, Postgres row-locks the event row for the first `UPDATE`; the second statement waits, then **re-evaluates its `WHERE` clause against the updated row**. If not enough seats remain, it matches zero rows and reports `affected = 0`, and the worker marks that booking `FAILED`. There is no window between "read the count" and "write the count" for another transaction to sneak into.

As a backstop, the schema carries a `CHECK (available_seats >= 0 AND available_seats <= total_seats)` constraint, so even a future buggy code path physically cannot drive the count negative.

The included `scripts/concurrency-check.mjs` demonstrates this: 10 concurrent bookings against 5 seats always end with exactly 5 confirmed.

### How duplicates are prevented

Idempotency is layered end to end, keyed on the client-supplied `requestId`:

1. **Unique index on `bookings.request_id`.** The database is the source of truth — no application check can race past it.
2. **Insert-and-catch, not select-then-insert.** The endpoint inserts directly and catches Postgres error `23505` (unique violation), then returns the _original_ booking with `duplicate: true` and the same `202`. A select-then-insert check would be a TOCTOU race: two identical requests can both pass the select before either inserts. The unique index makes exactly one insert win, deterministically.
3. **Queue-level dedupe.** The job is enqueued with `jobId = booking.id`, so BullMQ drops a second enqueue of the same booking.
4. **Worker `PENDING` guard.** The worker exits early unless the booking is still `PENDING`, so a retried or duplicated job can never deduct seats twice.

### Polling vs push

The dashboard polls every 3 seconds. At this scale that's a deliberate simplicity trade-off: it survives reconnects for free and needs zero server state. The push-based alternative is listed under improvements.

## What I would improve with more time

- **Outbox pattern** for the insert→enqueue gap: if the process dies after the booking insert but before the enqueue, the booking stays `PENDING` forever. An outbox table written in the same transaction plus a relay would close it.
- **Integration tests with Testcontainers** — real Postgres and Redis per test run, covering the race conditions the unit tests can only mock.
- **WebSocket/SSE** to push status changes instead of 3-second polling.
- **Auth and rate limiting** — the API is currently open.
- **Dead-letter alerting** — jobs that exhaust their 3 retries should page someone, not sit in a failed set.
- **Past-event validation** — reject bookings for events whose date has passed.
