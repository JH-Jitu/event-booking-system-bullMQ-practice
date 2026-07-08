import type { BookingStatus, EventSummary } from '../lib/api';

interface BookingFiltersProps {
  events: EventSummary[];
  eventId: number | undefined;
  status: BookingStatus | undefined;
  onEventIdChange: (eventId: number | undefined) => void;
  onStatusChange: (status: BookingStatus | undefined) => void;
}

const statusOptions: BookingStatus[] = ['PENDING', 'CONFIRMED', 'FAILED'];

const selectClasses =
  'min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:flex-none';

export function BookingFilters({
  events,
  eventId,
  status,
  onEventIdChange,
  onStatusChange,
}: BookingFiltersProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
      <label htmlFor="filter-event" className="sr-only">
        Filter by event
      </label>
      <select
        id="filter-event"
        value={eventId ?? ''}
        onChange={(e) =>
          onEventIdChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className={selectClasses}
      >
        <option value="">All events</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>

      <label htmlFor="filter-status" className="sr-only">
        Filter by status
      </label>
      <select
        id="filter-status"
        value={status ?? ''}
        onChange={(e) =>
          onStatusChange(
            e.target.value ? (e.target.value as BookingStatus) : undefined,
          )
        }
        className={selectClasses}
      >
        <option value="">All statuses</option>
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
