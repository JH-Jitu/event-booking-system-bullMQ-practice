import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ name: 'total_seats', type: 'int' })
  totalSeats: number;

  @Column({ name: 'available_seats', type: 'int' })
  availableSeats: number;

  @Column({ name: 'price_per_seat', type: 'numeric', precision: 10, scale: 2 })
  pricePerSeat: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
