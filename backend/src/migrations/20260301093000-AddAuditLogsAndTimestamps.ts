import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogsAndTimestamps20260301093000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now()`);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId" uuid,
        "actorUsername" varchar,
        "action" varchar NOT NULL,
        "entityType" varchar NOT NULL,
        "entityId" varchar,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
  }
}
