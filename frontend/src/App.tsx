import { useCallback, useEffect, useState } from 'react';
import { BookingFilters } from './components/booking-filters';
import { BookingForm } from './components/booking-form';
import { BookingsTable } from './components/bookings-table';
import { Toast } from './components/toast';
import type { ToastData } from './components/toast';
import { fetchBookings, fetchEvents } from './lib/api';
import type {
  BookingRow,
  BookingStatus,
  EventSummary,
  PaginationMeta,
} from './lib/api';

const PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 3_000;

function App() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [eventId, setEventId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [eventsData, bookingsPage] = await Promise.all([
        fetchEvents(),
        fetchBookings({ eventId, status, page, limit: PAGE_SIZE }),
      ]);
      setEvents(eventsData);
      setBookings(bookingsPage.data);
      setMeta(bookingsPage.meta);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to reach the API.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId, status, page]);

  useEffect(() => {
    setIsLoading(true);
    void refresh();

    // Poll so PENDING bookings visibly flip to CONFIRMED/FAILED
    const intervalId = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  const showToast = useCallback(
    (kind: ToastData['kind'], message: string) =>
      setToast({ id: Date.now(), kind, message }),
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  function handleEventFilterChange(nextEventId: number | undefined) {
    setEventId(nextEventId);
    setPage(1);
  }

  function handleStatusFilterChange(nextStatus: BookingStatus | undefined) {
    setStatus(nextStatus);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white shadow-sm">
              E
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                Event Booking Dashboard
              </h1>
              <p className="hidden text-sm text-slate-500 sm:block">
                Book seats and track booking status in real time.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span
              className={`size-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}
            />
            {error ? 'Offline' : 'Live'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span className="font-semibold">Connection problem:</span> {error}{' '}
            Retrying automatically…
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="min-w-0 lg:sticky lg:top-6">
            <BookingForm
              events={events}
              onCreated={() => void refresh()}
              onToast={showToast}
            />
          </div>

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Bookings
              </h2>
              <BookingFilters
                events={events}
                eventId={eventId}
                status={status}
                onEventIdChange={handleEventFilterChange}
                onStatusChange={handleStatusFilterChange}
              />
            </div>

            <BookingsTable
              bookings={bookings}
              meta={meta}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          </section>
        </div>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
