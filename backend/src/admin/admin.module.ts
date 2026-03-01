import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { UsersModule } from "../users/users.module";
import { RoomsModule } from "../rooms/rooms.module";
import { MessagesModule } from "../messages/messages.module";
import { RolesGuard } from "../common/roles.guard";
import { AuditLogService } from "./audit-log.service";
import { AuditLog } from "../entities/audit-log.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), UsersModule, RoomsModule, MessagesModule],
  controllers: [AdminController],
  providers: [RolesGuard, AuditLogService]
})
export class AdminModule {}