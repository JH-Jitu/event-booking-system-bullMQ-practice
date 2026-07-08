#!/usr/bin/env node
/**
 * Concurrency / overbooking check.
 *
 * Fires N concurrent 1-seat bookings (unique requestIds) at one event, waits
 * for the worker to process them, then asserts that the number of CONFIRMED
 * bookings never exceeds the seats that were available beforehand.
 *
 * Usage: node scripts/concurrency-check.mjs [eventId] [n]
 *   eventId  target event (default: 3, the 5-seat demo event)
 *   n        concurrent bookings to fire (default: 10)
 * Env: BASE_URL (default http://localhost:3000)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const eventId = Number(process.argv[2] ?? 3);
const n = Number(process.argv[3] ?? 10);
const WORKER_WAIT_MS = 4000;

async function getJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function getEvent(id) {
  const events = await getJson('/events');
  const event = events.find((e) => e.id === id);
  if (!event) throw new Error(`Event ${id} not found`);
  return event;
}

async function fireBooking(requestId) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId,
      eventId,
      customerName: 'Concurrency Check',
      customerEmail: 'concurrency@check.test',
      seats: 1,
    }),
  });
  const body = await res.json();
  if (res.status !== 202) {
    throw new Error(`POST /bookings -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body.bookingReference;
}

async function fetchAllBookings() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await getJson(
      `/bookings?eventId=${eventId}&page=${page}&limit=50`,
    );
    all.push(...data);
    if (page >= meta.totalPages) break;
  }
  return all;
}

const before = await getEvent(eventId);
console.log(
  `Event ${eventId} "${before.name}": ${before.availableSeats}/${before.totalSeats} seats available`,
);
console.log(`Firing ${n} concurrent 1-seat bookings...`);

const runId = Date.now();
const references = await Promise.all(
  Array.from({ length: n }, (_, i) =>
    fireBooking(`concurrency-${runId}-${i}`),
  ),
);
console.log(`All ${n} requests accepted (202). Waiting ${WORKER_WAIT_MS}ms for the worker...`);

await new Promise((resolve) => setTimeout(resolve, WORKER_WAIT_MS));

const wanted = new Set(references);
const allBookings = await fetchAllBookings();
const mine = allBookings.filter((b) => wanted.has(b.bookingReference));
const confirmed = mine.filter((b) => b.status === 'CONFIRMED').length;
const failed = mine.filter((b) => b.status === 'FAILED').length;
const pending = n - confirmed - failed;

// Seat math must hold across ALL bookings for the event, not just this run's:
// total_seats - confirmed seats (all time) must equal what's left.
const confirmedSeatsAllTime = allBookings
  .filter((b) => b.status === 'CONFIRMED')
  .reduce((sum, b) => sum + b.seats, 0);

const after = await getEvent(eventId);

console.log('');
console.log(`This run:  CONFIRMED=${confirmed}  FAILED=${failed}  PENDING=${pending}`);
console.log(`Seats:     before=${before.availableSeats}  after=${after.availableSeats}`);

const checks = [
  {
    name: `confirmed this run (${confirmed}) <= seats available before (${before.availableSeats})`,
    ok: confirmed <= before.availableSeats,
  },
  {
    name: `all confirmed seats ever (${confirmedSeatsAllTime}) + remaining (${after.availableSeats}) === total (${after.totalSeats})`,
    ok: confirmedSeatsAllTime + after.availableSeats === after.totalSeats,
  },
  {
    name: `no booking left PENDING (${pending} pending)`,
    ok: pending === 0,
  },
  {
    name: `available seats never negative (${after.availableSeats} >= 0)`,
    ok: after.availableSeats >= 0,
  },
];

console.log('');
let allOk = true;
for (const check of checks) {
  console.log(`  ${check.ok ? 'ok  ' : 'FAIL'}  ${check.name}`);
  if (!check.ok) allOk = false;
}

console.log('');
console.log(allOk ? 'PASS - no overbooking detected' : 'FAIL - overbooking detected!');
process.exit(allOk ? 0 : 1);
