# Event Booking System

A small event booking system where users book seats for events. The API accepts bookings instantly (`202 Accepted`) and processes them asynchronously through a Redis-backed queue, so the endpoint stays fast even when many bookings arrive at once. A React dashboard lists bookings, shows their live status, and lets you create new ones.

- **Backend:** NestJS (TypeScript), PostgreSQL, Redis + BullMQ
- **Frontend:** React (TypeScript), Vite, Tailwind CSS

## Project structure

```
event-booking-system/
├── docker-compose.yml     # PostgreSQL + Redis
├── backend/               # NestJS API + queue worker
│   ├── src/
│   │   ├── events/        # GET /events
│   │   ├── bookings/      # POST/GET /bookings + BullMQ processor
│   │   └── database/      # data source, migrations, seed script
│   └── scripts/           # concurrency demo script
└── frontend/              # React dashboard
```

## Setup and run

Prerequisites: Node.js 20+, Docker (for PostgreSQL and Redis).

**1. Start PostgreSQL and Redis**

```bash
docker compose up -d
```

Postgres listens on `5432`, Redis on `6379`. If either port is taken on your machine, override it and mirror the change in `backend/.env`:

```bash
# example: run Redis on 6380 instead
REDIS_PORT=6380 docker compose up -d
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

**4. Tests** (from `backend/`)

```bash
npm test
```

**5. Optional: concurrency demo** (from `backend/`, with the API running)

Fires 10 concurrent 1-seat bookings at the 5-seat "Exclusive Wine Tasting" event (eventId: 3 - from seed data) and verifies exactly 5 confirm and 5 fail: (as total and available seats 5)

```bash
node scripts/concurrency-check.mjs 3 10
```

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

`POST /bookings` only validates the payload, checks the event exists, inserts a `PENDING` row, and enqueues a BullMQ job — no seat math on the request path. The worker (a BullMQ processor inside the same Nest process) does the real
work: deduct seats and mark the booking `CONFIRMED`, or mark it `FAILED` with a reason. Jobs retry up to 3 times with exponential backoff, but only for unexpected errors (e.g. a dropped DB connection). Business outcomes like
"sold out" complete the job normally with a `FAILED` booking status — retrying those would never succeed.
