const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface EventSummary {
  id: number;
  name: string;
  date: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: string;
  createdAt: string;
}

export interface BookingRow {
  bookingReference: string;
  eventId: number;
  eventName: string;
  customerName: string;
  customerEmail: string;
  seats: number;
  status: BookingStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookingsPage {
  data: BookingRow[];
  meta: PaginationMeta;
}

export interface BookingFilters {
  eventId?: number;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface CreateBookingInput {
  requestId: string;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
}

export interface AcceptedBooking {
  bookingReference: string;
  status: BookingStatus;
  duplicate: boolean;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
    } catch {
      // non-JSON error body; keep the status-based message
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function fetchEvents(): Promise<EventSummary[]> {
  return request<EventSummary[]>('/events');
}

export function fetchBookings(filters: BookingFilters = {}): Promise<BookingsPage> {
  const params = new URLSearchParams();
  if (filters.eventId !== undefined) params.set('eventId', String(filters.eventId));
  if (filters.status !== undefined) params.set('status', filters.status);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));

  const query = params.toString();
  return request<BookingsPage>(query ? `/bookings?${query}` : '/bookings');
}

export function createBooking(input: CreateBookingInput): Promise<AcceptedBooking> {
  return request<AcceptedBooking>('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
