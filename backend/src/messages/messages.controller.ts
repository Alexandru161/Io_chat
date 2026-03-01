import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";

@Controller("api/messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(JwtAccessGuard)
  @Get()
  listMessages(@Query("roomId") roomId?: string) {
    if (!roomId) {
      throw new BadRequestException("roomId is required");
    }
    return this.messagesService.listByRoom(roomId);
  }

  @UseGuards(JwtAccessGuard)
  @Post()
  createMessage(@Body() dto: CreateMessageDto, @Req() req: { user?: { sub?: string } }) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.messagesService.createMessage(dto.roomId, userId, dto.content);
  }
}
