import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsAndBookings1751964000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "date" TIMESTAMPTZ NOT NULL,
        "total_seats" INT NOT NULL,
        "available_seats" INT NOT NULL,
        "price_per_seat" NUMERIC(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "chk_events_total_seats_positive" CHECK ("total_seats" > 0),
        CONSTRAINT "chk_events_available_seats_range"
          CHECK ("available_seats" >= 0 AND "available_seats" <= "total_seats")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" VARCHAR(255) NOT NULL,
        "event_id" INT NOT NULL,
        "customer_name" VARCHAR(255) NOT NULL,
        "customer_email" VARCHAR(255) NOT NULL,
        "seats" INT NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        "failure_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_bookings_event" FOREIGN KEY ("event_id")
          REFERENCES "events" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_bookings_seats_positive" CHECK ("seats" > 0),
        CONSTRAINT "chk_bookings_status"
          CHECK ("status" IN ('PENDING', 'CONFIRMED', 'FAILED'))
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_bookings_request_id" ON "bookings" ("request_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_event_id" ON "bookings" ("event_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
