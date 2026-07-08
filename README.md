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
