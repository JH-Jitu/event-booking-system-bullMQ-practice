import type { BookingRow, PaginationMeta } from '../lib/api';
import { StatusBadge } from './status-badge';

interface BookingsTableProps {
  bookings: BookingRow[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function BookingsTable({
  bookings,
  meta,
  isLoading,
  onPageChange,
}: BookingsTableProps) {
  const showEmptyState = !isLoading && bookings.length === 0;
  const page = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="hidden px-4 py-3 sm:table-cell">Reference</th>
              <th scope="col" className="px-4 py-3">Event</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3 text-right">Seats</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="hidden px-4 py-3 xl:table-cell">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Loading bookings…
                </td>
              </tr>
            )}

            {showEmptyState && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No bookings found. Create one above to get started.
                </td>
              </tr>
            )}

            {bookings.map((booking) => (
              <tr key={booking.bookingReference} className="hover:bg-slate-50">
                <td
                  className="hidden px-4 py-2.5 font-mono text-xs text-slate-400 sm:table-cell"
                  title={booking.bookingReference}
                >
                  {booking.bookingReference.slice(0, 8)}
                </td>
                <td className="min-w-44 px-4 py-2.5 font-medium text-slate-900">
                  {booking.eventName}
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{booking.customerName}</div>
                  <div className="text-xs text-slate-400">
                    {booking.customerEmail}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {booking.seats}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={booking.status} />
                  {booking.status === 'FAILED' && booking.failureReason && (
                    <div className="mt-1 text-xs text-red-600">
                      {booking.failureReason}
                    </div>
                  )}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-slate-500 xl:table-cell">
                  {formatDateTime(booking.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {meta
            ? `Page ${meta.page} of ${Math.max(meta.totalPages, 1)} — ${meta.total} booking${meta.total === 1 ? '' : 's'}`
            : '—'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
