import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../entities/audit-log.entity";
import { UsersService } from "../users/users.service";

export type AuditLogParams = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditQuery = {
  page: number;
  pageSize: number;
  q?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: Date;
  to?: Date;
};

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly usersService: UsersService
  ) {}

  async record(params: AuditLogParams) {
    const actorId = params.actorId ?? null;
    let actorUsername: string | null = null;
    if (actorId) {
      const actor = await this.usersService.findById(actorId);
      actorUsername = actor?.username ?? null;
    }

    const entry = this.auditRepo.create({
      actorId,
      actorUsername,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? null
    });

    await this.auditRepo.save(entry);
    return entry;
  }

  async listPaged(query: AuditQuery) {
    const qb = this.auditRepo.createQueryBuilder("audit");

    if (query.q) {
      qb.andWhere(
        "audit.actorUsername ILIKE :q OR audit.action ILIKE :q OR audit.entityType ILIKE :q OR audit.entityId ILIKE :q",
        { q: `%${query.q}%` }
      );
    }

    if (query.action) {
      qb.andWhere("audit.action = :action", { action: query.action });
    }

    if (query.entityType) {
      qb.andWhere("audit.entityType = :entityType", { entityType: query.entityType });
    }

    if (query.actor) {
      qb.andWhere("audit.actorUsername ILIKE :actor", { actor: `%${query.actor}%` });
    }

    if (query.from) {
      qb.andWhere("audit.createdAt >= :from", { from: query.from.toISOString() });
    }

    if (query.to) {
      qb.andWhere("audit.createdAt <= :to", { to: query.to.toISOString() });
    }

    qb.orderBy("audit.createdAt", "DESC");

    const total = await qb.getCount();
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);

    const data = await qb
      .skip((page - 1) * query.pageSize)
      .take(query.pageSize)
      .getMany();

    return {
      data,
      page,
      pageSize: query.pageSize,
      total,
      totalPages
    };
  }
}
