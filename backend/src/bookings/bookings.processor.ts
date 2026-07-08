import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Event } from 'src/events/event.entity';
import { DataSource } from 'typeorm';
import { BOOKING_QUEUE, BookingJobData } from './booking-queue.constants';
import { Booking } from './booking.entity';

@Processor(BOOKING_QUEUE)
export class BookingsProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingsProcessor.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async process(job: Job<BookingJobData>): Promise<void> {
    const { bookingId } = job.data;

    await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
      });

      if (!booking) {
        this.logger.warn(
          `Booking ${bookingId} not found; skipping job ${job.id}`,
        );
        return;
      }

      // Retried or duplicated jobs
      if (booking.status !== 'PENDING') {
        this.logger.log(
          `Booking ${bookingId} already processed; skipping job ${job.id}`,
        );
        return;
      }

      const deductionResult = await manager
        .createQueryBuilder()
        .update(Event)
        .set({ availableSeats: () => 'available_seats - :seats' })
        .where('id = :eventId AND available_seats >= :seats', {
          eventId: booking.eventId,
          seats: booking.seats,
        })
        .execute();

      if (deductionResult.affected === 1) {
        await manager.update(Booking, bookingId, { status: 'CONFIRMED' });
        this.logger.log(
          `Booking ${bookingId} confirmed (event ${booking.eventId}, ${booking.seats} seat(s))`,
        );
      } else {
        await manager.update(Booking, bookingId, {
          status: 'FAILED',
          failureReason: 'Not enough seats available',
        });
        this.logger.log(
          `Booking ${bookingId} failed (event ${booking.eventId}, ${booking.seats} seat(s) - FAILED: not enough seats)`,
        );
      }
    });
  }
}
