import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  AcceptedBooking,
  BookingsService,
  PaginatedBookings,
} from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateBookingDto): Promise<AcceptedBooking> {
    return this.bookingsService.accept(dto);
  }

  @Get()
  list(@Query() query: ListBookingsQueryDto): Promise<PaginatedBookings> {
    return this.bookingsService.list(query);
  }
}
