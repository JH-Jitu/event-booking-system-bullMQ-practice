import 'dotenv/config';
import { DataSource } from 'typeorm';

// used by the TypeORM CLI (migrations) and the seed

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'booking',
  password: process.env.DATABASE_PASSWORD ?? 'booking',
  database: process.env.DATABASE_NAME ?? 'event_booking',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
