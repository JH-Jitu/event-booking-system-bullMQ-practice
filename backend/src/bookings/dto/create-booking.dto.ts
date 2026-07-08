import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requestId: string;

  @IsInt()
  @Min(1)
  eventId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName: string;

  @IsEmail()
  @MaxLength(255)
  customerEmail: string;

  @IsInt()
  @Min(1)
  seats: number;
}
