import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "audit_logs" })
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "varchar", nullable: true })
  actorUsername!: string | null;

  @Column({ type: "varchar" })
  action!: string;

  @Column({ type: "varchar" })
  entityType!: string;

  @Column({ type: "varchar", nullable: true })
  entityId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
