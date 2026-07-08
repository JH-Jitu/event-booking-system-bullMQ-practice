import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Event } from '../events/event.entity';

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_bookings_request_id', { unique: true })
  @Column({ name: 'request_id', length: 255 })
  requestId: string;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'customer_name', length: 255 })
  customerName: string;

  @Column({ name: 'customer_email', length: 255 })
  customerEmail: string;

  @Column({ type: 'int' })
  seats: number;

  @Index('idx_bookings_status')
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: BookingStatus;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
