import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class AddCascadeDeletes20260228120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceForeignKey(queryRunner, "messages", "roomId", "rooms", "CASCADE");
    await this.replaceForeignKey(queryRunner, "messages", "userId", "users", "CASCADE");
    await this.replaceForeignKey(queryRunner, "room_members", "roomId", "rooms", "CASCADE");
    await this.replaceForeignKey(queryRunner, "room_members", "userId", "users", "CASCADE");
    await this.replaceForeignKey(queryRunner, "refresh_tokens", "userId", "users", "CASCADE");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.replaceForeignKey(queryRunner, "messages", "roomId", "rooms", "NO ACTION");
    await this.replaceForeignKey(queryRunner, "messages", "userId", "users", "NO ACTION");
    await this.replaceForeignKey(queryRunner, "room_members", "roomId", "rooms", "NO ACTION");
    await this.replaceForeignKey(queryRunner, "room_members", "userId", "users", "NO ACTION");
    await this.replaceForeignKey(queryRunner, "refresh_tokens", "userId", "users", "NO ACTION");
  }

  private async replaceForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    referencedTableName: string,
    onDelete: "CASCADE" | "NO ACTION"
  ) {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }

    const existing = table.foreignKeys.find((fk) => fk.columnNames.includes(columnName));
    if (existing) {
      await queryRunner.dropForeignKey(table, existing);
    }

    const fk = new TableForeignKey({
      columnNames: [columnName],
      referencedTableName,
      referencedColumnNames: ["id"],
      onDelete
    });

    await queryRunner.createForeignKey(table, fk);
  }
}
