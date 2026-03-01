import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { Message } from "../entities/message.entity";
import { Room } from "../entities/room.entity";
import { User } from "../entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Message, Room, User])],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService]
})
export class MessagesModule {}
