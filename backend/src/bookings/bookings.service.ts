import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { Booking } from './booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query';

interface BookingListItem {
  bookingReference: string;
  eventId: number;
  eventName: string;
  customerName: string;
  customerEmail: string;
  seats: number;
  status: string;
  failureReason: string | null;
  createdAt: Date;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AcceptedBooking {
  bookingReference: string;
  status: string;
  duplicate: boolean;
}

export interface PaginatedBookings {
  data: BookingListItem[];
  meta: PaginationMeta;
}

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async accept(dto: CreateBookingDto): Promise<AcceptedBooking> {
    const eventExists = await this.eventRepository.existsBy({
      id: dto.eventId,
    });
    if (!eventExists) {
      throw new NotFoundException(`Event ${dto.eventId} doesn't exist`);
    }

    try {
      const booking = await this.bookingRepository.save(
        this.bookingRepository.create({
          requestId: dto.requestId,
          eventId: dto.eventId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          seats: dto.seats,
          status: 'PENDING',
        }),
      );
      return {
        bookingReference: booking.id,
        status: booking.status,
        duplicate: false,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.bookingRepository.findOneByOrFail({
          requestId: dto.requestId,
        });
        return {
          bookingReference: existing.id,
          status: existing.status,
          duplicate: true,
        };
      }
      throw error;
    }
  }

  async list(query: ListBookingsQueryDto): Promise<PaginatedBookings> {
    const { page, limit, eventId, status } = query;

    const [bookings, total] = await this.bookingRepository.findAndCount({
      where: {
        ...(eventId !== undefined && { eventId }),
        ...(status !== undefined && { status }),
      },
      relations: { event: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: bookings.map((booking) => ({
        bookingReference: booking.id,
        eventId: booking.eventId,
        eventName: booking.event.name,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        seats: booking.seats,
        status: booking.status,
        failureReason: booking.failureReason,
        createdAt: booking.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
    );
  }
}
