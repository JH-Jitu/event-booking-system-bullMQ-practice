import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from 'src/events/event.entity';
import { QueryFailedError } from 'typeorm';
import { BOOKING_QUEUE } from './booking-queue.constants';
import { Booking } from './booking.entity';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockBookingRepository = {
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneByOrFail: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockEventRepository = {
    existsBy: jest.fn(),
  };

  const mockBookingQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getQueueToken(BOOKING_QUEUE),
          useValue: mockBookingQueue,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('accept', () => {
    const createDto = {
      requestId: 'req-123',
      eventId: 1,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      seats: 2,
    };

    it('should throw NotFoundException if event does not exist, nothing saved, nothing enqueued', async () => {
      mockEventRepository.existsBy.mockResolvedValueOnce(false);

      await expect(service.accept(createDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockBookingRepository.save).not.toHaveBeenCalled();
      expect(mockBookingQueue.add).not.toHaveBeenCalled();
    });

    it('should return reference + PENDING, and enqueue with jobId = booking id on happy path', async () => {
      mockEventRepository.existsBy.mockResolvedValueOnce(true);

      const createdBooking = {
        id: 'booking-uuid-1',
        status: 'PENDING',
        ...createDto,
      };
      mockBookingRepository.create.mockReturnValueOnce(createdBooking);
      mockBookingRepository.save.mockResolvedValueOnce(createdBooking);

      const result = await service.accept(createDto);

      expect(result).toEqual({
        bookingReference: 'booking-uuid-1',
        status: 'PENDING',
        duplicate: false,
      });

      expect(mockBookingRepository.save).toHaveBeenCalledWith(createdBooking);
      expect(mockBookingQueue.add).toHaveBeenCalledWith(
        'process-booking',
        { bookingId: 'booking-uuid-1' },
        { jobId: 'booking-uuid-1' },
      );
    });

    it('should handle duplicate requestId by returning the original booking with duplicate: true and not enqueue again', async () => {
      mockEventRepository.existsBy.mockResolvedValueOnce(true);

      const createdBooking = {
        id: 'booking-uuid-2',
        status: 'PENDING',
        ...createDto,
      };
      mockBookingRepository.create.mockReturnValueOnce(createdBooking);

      const duplicateError = new QueryFailedError(
        'query',
        [],
        new Error('driver error'),
      );
      Object.assign(duplicateError, { driverError: { code: '23505' } });
      mockBookingRepository.save.mockRejectedValueOnce(duplicateError);

      const existingBooking = { id: 'existing-uuid-123', status: 'CONFIRMED' };
      mockBookingRepository.findOneByOrFail.mockResolvedValueOnce(
        existingBooking,
      );

      const result = await service.accept(createDto);

      expect(result).toEqual({
        bookingReference: 'existing-uuid-123',
        status: 'CONFIRMED',
        duplicate: true,
      });

      expect(mockBookingRepository.findOneByOrFail).toHaveBeenCalledWith({
        requestId: createDto.requestId,
      });
      expect(mockBookingQueue.add).not.toHaveBeenCalled();
    });

    it('should rethrow unexpected DB errors', async () => {
      mockEventRepository.existsBy.mockResolvedValueOnce(true);

      const createdBooking = {
        id: 'booking-uuid-3',
        status: 'PENDING',
        ...createDto,
      };
      mockBookingRepository.create.mockReturnValueOnce(createdBooking);

      const unexpectedError = new Error('Database connection lost');
      mockBookingRepository.save.mockRejectedValueOnce(unexpectedError);

      await expect(service.accept(createDto)).rejects.toThrow(unexpectedError);
      expect(mockBookingQueue.add).not.toHaveBeenCalled();
    });
  });
});
