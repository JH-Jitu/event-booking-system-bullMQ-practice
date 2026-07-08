import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { BookingJobData } from './booking-queue.constants';
import { Booking } from './booking.entity';
import { BookingsProcessor } from './bookings.processor';

describe('BookingsProcessor', () => {
  let processor: BookingsProcessor;

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation((cb: (em: typeof mockEntityManager) => unknown) =>
        cb(mockEntityManager),
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsProcessor,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    processor = module.get<BookingsProcessor>(BookingsProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should update booking to CONFIRMED when affected is 1', async () => {
      const jobData: BookingJobData = { bookingId: 'booking-uuid-1' };
      const mockJob = { id: 'job-1', data: jobData } as Job<BookingJobData>;
      const mockBooking = {
        id: 'booking-uuid-1',
        eventId: 1,
        seats: 2,
        status: 'PENDING',
      };
      mockEntityManager.findOne.mockResolvedValueOnce(mockBooking);

      mockQueryBuilder.execute.mockResolvedValueOnce({ affected: 1 });

      await processor.process(mockJob);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
        where: { id: 'booking-uuid-1' },
      });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Booking,
        'booking-uuid-1',
        {
          status: 'CONFIRMED',
        },
      );
    });

    it('should update booking to FAILED with the reason when affected is 0', async () => {
      const jobData: BookingJobData = { bookingId: 'booking-uuid-2' };
      const mockJob = { id: 'job-2', data: jobData } as Job<BookingJobData>;
      const mockBooking = {
        id: 'booking-uuid-2',
        eventId: 1,
        seats: 2,
        status: 'PENDING',
      };
      mockEntityManager.findOne.mockResolvedValueOnce(mockBooking);

      mockQueryBuilder.execute.mockResolvedValueOnce({ affected: 0 });

      await processor.process(mockJob);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
        where: { id: 'booking-uuid-2' },
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Booking,
        'booking-uuid-2',
        {
          status: 'FAILED',
          failureReason: 'Not enough seats available',
        },
      );
    });

    it('should neither touch query builder nor update when booking is already CONFIRMED', async () => {
      const jobData: BookingJobData = { bookingId: 'booking-uuid-3' };
      const mockJob = { id: 'job-3', data: jobData } as Job<BookingJobData>;
      const mockBooking = {
        id: 'booking-uuid-3',
        eventId: 1,
        seats: 2,
        status: 'CONFIRMED',
      };
      mockEntityManager.findOne.mockResolvedValueOnce(mockBooking);

      await processor.process(mockJob);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
        where: { id: 'booking-uuid-3' },
      });

      expect(mockEntityManager.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockEntityManager.update).not.toHaveBeenCalled();
    });

    it('should neither touch query builder nor update when booking is missing', async () => {
      const jobData: BookingJobData = { bookingId: 'booking-uuid-1' };
      const mockJob = { id: 'job-4', data: jobData } as Job<BookingJobData>;
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await processor.process(mockJob);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
        where: { id: 'booking-uuid-1' },
      });

      expect(mockEntityManager.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockEntityManager.update).not.toHaveBeenCalled();
    });
  });
});
