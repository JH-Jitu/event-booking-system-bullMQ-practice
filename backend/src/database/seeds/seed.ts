import { AppDataSource } from '../data-source';
import { Event } from '../../events/event.entity';

async function seed() {
  await AppDataSource.initialize();

  try {
    const eventRepo = AppDataSource.getRepository(Event);

    const existingCount = await eventRepo.count();
    if (existingCount > 0) {
      console.log(`Skipping seed: ${existingCount} event(s) already exist.`);
      return;
    }

    const events = eventRepo.create([
      {
        name: 'Tech Conference 2026',
        date: new Date('2026-09-15T09:00:00Z'),
        totalSeats: 500,
        availableSeats: 500,
        pricePerSeat: '149.99',
      },
      {
        name: 'Jazz Night at the Riverside',
        date: new Date('2026-08-01T19:30:00Z'),
        totalSeats: 120,
        availableSeats: 120,
        pricePerSeat: '45.00',
      },
      {
        // intentionally tiny capacity to demo concurrent overbooking protection
        name: 'Exclusive Wine Tasting',
        date: new Date('2026-07-25T18:00:00Z'),
        totalSeats: 5,
        availableSeats: 5,
        pricePerSeat: '85.50',
      },
    ]);

    await eventRepo.save(events);
    console.log(`Seeded ${events.length} events.`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
