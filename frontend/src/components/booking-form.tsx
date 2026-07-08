import type { FormEvent } from 'react';
import { useState } from 'react';
import type { EventSummary } from '../lib/api';
import { createBooking } from '../lib/api';

interface BookingFormProps {
  events: EventSummary[];
  onCreated: () => void;
  onToast: (kind: 'success' | 'error', message: string) => void;
}

interface FormState {
  eventId: string;
  customerName: string;
  customerEmail: string;
  seats: string;
}

const initialForm: FormState = {
  eventId: '',
  customerName: '',
  customerEmail: '',
  seats: '1',
};

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-50';

const labelClasses = 'mb-1 block text-sm font-medium text-slate-700';

export function BookingForm({ events, onCreated, onToast }: BookingFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEvent = events.find(
    (event) => String(event.id) === form.eventId,
  );

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const accepted = await createBooking({
        requestId: crypto.randomUUID(),
        eventId: Number(form.eventId),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        seats: Number(form.seats),
      });
      onToast(
        'success',
        `Booking accepted${accepted.duplicate ? ' (duplicate request)' : ''} — reference ${accepted.bookingReference.slice(0, 8)}. Watch the table for the result.`,
      );
      setForm(initialForm);
      onCreated();
    } catch (submitError) {
      onToast(
        'error',
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong while creating the booking.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">New booking</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Processed asynchronously — the result appears in the table.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="booking-event" className={labelClasses}>
            Event
          </label>
          <select
            id="booking-event"
            required
            value={form.eventId}
            onChange={(e) => updateField('eventId', e.target.value)}
            disabled={isSubmitting}
            className={inputClasses}
          >
            <option value="" disabled>
              Select an event…
            </option>
            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
                disabled={event.availableSeats === 0}
              >
                {event.name}
                {event.availableSeats === 0
                  ? ' — Sold out'
                  : ` (${event.availableSeats} seats left)`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="booking-name" className={labelClasses}>
            Name
          </label>
          <input
            id="booking-name"
            type="text"
            required
            maxLength={255}
            placeholder="Jane Doe"
            value={form.customerName}
            onChange={(e) => updateField('customerName', e.target.value)}
            disabled={isSubmitting}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="booking-email" className={labelClasses}>
            Email
          </label>
          <input
            id="booking-email"
            type="email"
            required
            maxLength={255}
            placeholder="jane@example.com"
            value={form.customerEmail}
            onChange={(e) => updateField('customerEmail', e.target.value)}
            disabled={isSubmitting}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="booking-seats" className={labelClasses}>
            Seats
          </label>
          <input
            id="booking-seats"
            type="number"
            required
            min={1}
            max={selectedEvent?.availableSeats}
            step={1}
            value={form.seats}
            onChange={(e) => updateField('seats', e.target.value)}
            disabled={isSubmitting}
            className={inputClasses}
          />
          {selectedEvent && (
            <p className="mt-1 text-xs text-slate-400">
              Up to {selectedEvent.availableSeats}{' '}
              {selectedEvent.availableSeats === 1 ? 'seat' : 'seats'} available
              right now.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Booking…' : 'Book seats'}
        </button>
      </div>
    </form>
  );
}
