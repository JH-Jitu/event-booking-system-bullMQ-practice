import type { BookingStatus } from '../lib/api';

interface StatusBadgeProps {
  status: BookingStatus;
}

const badgeStyles: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/25',
  FAILED: 'bg-red-50 text-red-700 ring-red-600/25',
};

const dotStyles: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-500 animate-pulse',
  CONFIRMED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyles[status]}`}
    >
      <span className={`size-1.5 rounded-full ${dotStyles[status]}`} />
      {status}
    </span>
  );
}
