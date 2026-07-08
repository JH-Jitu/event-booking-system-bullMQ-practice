import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from './bookings/bookings.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USERNAME', 'booking'),
        password: config.get<string>('DATABASE_PASSWORD', 'booking'),
        database: config.get<string>('DATABASE_NAME', 'event_booking'),
        autoLoadEntities: true,
        synchronize: false, // schema changes go trhough migration, instead auto-sync
      }),
    }),
    EventsModule,
    BookingsModule,
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
