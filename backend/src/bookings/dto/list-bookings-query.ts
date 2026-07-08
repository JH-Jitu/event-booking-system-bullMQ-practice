import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { BookingStatus } from '../booking.entity';
import { BOOKING_STATUSES } from '../booking.entity';

export class ListBookingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId?: number;

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: BookingStatus;
}
