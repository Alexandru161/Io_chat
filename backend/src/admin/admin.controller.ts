import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response, Request } from "express";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { ROLES } from "../common/roles.constants";
import { MessagesService } from "../messages/messages.service";
import { RoomsService } from "../rooms/rooms.service";
import { UsersService } from "../users/users.service";
import { AuditLogService } from "./audit-log.service";
import { BulkDeleteDto } from "./dto/bulk-delete.dto";
import { BulkUserBanDto } from "./dto/bulk-user-ban.dto";
import { BulkUserRoleDto } from "./dto/bulk-user-role.dto";
import { ListAuditQueryDto } from "./dto/list-audit.query.dto";
import { ListMessagesQueryDto } from "./dto/list-messages.query.dto";
import { ListRoomsQueryDto } from "./dto/list-rooms.query.dto";
import { ListUsersQueryDto } from "./dto/list-users.query.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { UpdateUserBanDto } from "./dto/update-user-ban.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@Controller("api/admin")
@UseGuards(JwtAccessGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
    private readonly auditLogService: AuditLogService
  ) {}

  private async recordAction(
    req: Request,
    action: string,
    entityType: string,
    entityId?: string | null,
    metadata?: Record<string, unknown>
  ) {
    const actorId = (req.user as { sub?: string } | undefined)?.sub;
    await this.auditLogService.record({
      actorId,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata
    });
  }

  private async ensureSupportCanBan(req: Request, targetUserId: string) {
    const actorId = (req.user as { sub?: string } | undefined)?.sub;
    if (!actorId) {
      throw new ForbiddenException("Access denied");
    }

    const actor = await this.usersService.findById(actorId);
    if (actor?.role !== ROLES.SUPPORT) {
      return;
    }

    const target = await this.usersService.findById(targetUserId);
    if (target?.role === ROLES.ADMIN) {
      throw new ForbiddenException("Support cannot ban admins");
    }
  }

  @Get("users")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsersPaged({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      q: query.q,
      role: query.role,
      status: query.status,
      sortBy: query.sortBy ?? "createdAt",
      sortDir: query.sortDir ?? "desc"
    });
  }

  @Patch("users/:id/role")
  @Roles(ROLES.ADMIN)
  async updateUserRole(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto
  ) {
    const user = await this.usersService.updateRole(id, dto.role);
    await this.recordAction(req, "user.role.update", "user", id, { role: dto.role });
    return user ? { id: user.id, username: user.username, role: user.role, isBanned: user.isBanned } : null;
  }

  @Patch("users/:id/ban")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  async updateUserBan(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserBanDto
  ) {
    await this.ensureSupportCanBan(req, id);
    const user = await this.usersService.setBanned(id, dto.isBanned);
    await this.recordAction(req, "user.ban.update", "user", id, { isBanned: dto.isBanned });
    return user ? { id: user.id, username: user.username, role: user.role, isBanned: user.isBanned } : null;
  }

  @Delete("users/:id")
  @Roles(ROLES.ADMIN)
  async deleteUser(@Req() req: Request, @Param("id") id: string) {
    const result = await this.usersService.deleteUser(id);
    await this.recordAction(req, "user.delete", "user", id);
    return result;
  }

  @Post("users/bulk-role")
  @Roles(ROLES.ADMIN)
  async bulkUserRole(@Req() req: Request, @Body() dto: BulkUserRoleDto) {
    const result = await this.usersService.bulkUpdateRole(dto.ids, dto.role);
    await this.recordAction(req, "user.bulk.role", "user", null, { role: dto.role, ids: dto.ids });
    return result;
  }

  @Post("users/bulk-ban")
  @Roles(ROLES.ADMIN)
  async bulkUserBan(@Req() req: Request, @Body() dto: BulkUserBanDto) {
    const result = await this.usersService.bulkUpdateBan(dto.ids, dto.isBanned);
    await this.recordAction(req, "user.bulk.ban", "user", null, { isBanned: dto.isBanned, ids: dto.ids });
    return result;
  }

  @Post("users/bulk-delete")
  @Roles(ROLES.ADMIN)
  async bulkUserDelete(@Req() req: Request, @Body() dto: BulkDeleteDto) {
    const result = await this.usersService.bulkDelete(dto.ids);
    await this.recordAction(req, "user.bulk.delete", "user", null, { ids: dto.ids });
    return result;
  }


  @Get("rooms")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  listRooms(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.listRoomsPaged({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      q: query.q,
      sortBy: query.sortBy ?? "createdAt",
      sortDir: query.sortDir ?? "desc"
    });
  }

  @Patch("rooms/:id")
  @Roles(ROLES.ADMIN)
  async updateRoom(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateRoomDto) {
    const result = await this.roomsService.updateRoomName(id, dto.name);
    await this.recordAction(req, "room.update", "room", id, { name: dto.name });
    return result;
  }

  @Delete("rooms/:id")
  @Roles(ROLES.ADMIN)
  async deleteRoom(@Req() req: Request, @Param("id") id: string) {
    const result = await this.roomsService.deleteRoom(id);
    await this.recordAction(req, "room.delete", "room", id);
    return result;
  }

  @Post("rooms/bulk-delete")
  @Roles(ROLES.ADMIN)
  async bulkRoomDelete(@Req() req: Request, @Body() dto: BulkDeleteDto) {
    const result = await this.roomsService.bulkDelete(dto.ids);
    await this.recordAction(req, "room.bulk.delete", "room", null, { ids: dto.ids });
    return result;
  }

  @Get("messages")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  listMessages(@Query() query: ListMessagesQueryDto) {
    return this.messagesService.listForAdminPaged({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      q: query.q,
      roomId: query.roomId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      sortDir: query.sortDir ?? "desc"
    });
  }

  @Patch("messages/:id")
  @Roles(ROLES.ADMIN)
  async updateMessage(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateMessageDto) {
    const result = await this.messagesService.updateMessage(id, dto.content);
    await this.recordAction(req, "message.update", "message", id, { content: dto.content });
    return result;
  }

  @Delete("messages/:id")
  @Roles(ROLES.ADMIN, ROLES.SUPPORT)
  async deleteMessage(@Req() req: Request, @Param("id") id: string) {
    const result = await this.messagesService.deleteMessage(id);
    await this.recordAction(req, "message.delete", "message", id);
    return result;
  }

  @Post("messages/bulk-delete")
  @Roles(ROLES.ADMIN)
  async bulkMessageDelete(@Req() req: Request, @Body() dto: BulkDeleteDto) {
    const result = await this.messagesService.bulkDelete(dto.ids);
    await this.recordAction(req, "message.bulk.delete", "message", null, { ids: dto.ids });
    return result;
  }

  @Get("audit")
  @Roles(ROLES.ADMIN)
  listAudit(@Query() query: ListAuditQueryDto) {
    return this.auditLogService.listPaged({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      q: query.q,
      action: query.action,
      entityType: query.entityType,
      actor: query.actor,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined
    });
  }

  @Get("export/users")
  @Roles(ROLES.ADMIN)
  async exportUsers(@Res({ passthrough: true }) res: Response, @Query() query: ListUsersQueryDto) {
    const result = await this.usersService.listUsersPaged({
      page: 1,
      pageSize: 100000,
      q: query.q,
      role: query.role,
      status: query.status,
      sortBy: query.sortBy ?? "createdAt",
      sortDir: query.sortDir ?? "desc"
    });

    const csv = this.toCsv([
      ["id", "username", "role", "isBanned", "createdAt"],
      ...result.data.map((user) => [
        user.id,
        user.username,
        user.role,
        String(user.isBanned),
        user.createdAt?.toISOString() ?? ""
      ])
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    return csv;
  }

  @Get("export/rooms")
  @Roles(ROLES.ADMIN)
  async exportRooms(@Res({ passthrough: true }) res: Response, @Query() query: ListRoomsQueryDto) {
    const result = await this.roomsService.listRoomsPaged({
      page: 1,
      pageSize: 100000,
      q: query.q,
      sortBy: query.sortBy ?? "createdAt",
      sortDir: query.sortDir ?? "desc"
    });

    const csv = this.toCsv([
      ["id", "name", "createdAt"],
      ...result.data.map((room) => [room.id, room.name, room.createdAt?.toISOString() ?? ""])
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=rooms.csv");
    return csv;
  }

  @Get("export/messages")
  @Roles(ROLES.ADMIN)
  async exportMessages(@Res({ passthrough: true }) res: Response, @Query() query: ListMessagesQueryDto) {
    const result = await this.messagesService.listForAdminPaged({
      page: 1,
      pageSize: 100000,
      q: query.q,
      roomId: query.roomId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      sortDir: query.sortDir ?? "desc"
    });

    const csv = this.toCsv([
      ["id", "content", "roomId", "userId", "username", "createdAt"],
      ...result.data.map((message) => [
        message.id,
        message.content,
        message.roomId ?? "",
        message.user?.id ?? "",
        message.user?.username ?? "",
        message.createdAt?.toISOString() ?? ""
      ])
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=messages.csv");
    return csv;
  }

  private toCsv(rows: string[][]) {
    return rows
      .map((row) =>
        row
          .map((value) => {
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      )
      .join("\n");
  }
}