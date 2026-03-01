import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RoomsService } from "./rooms.service";
import { CreateRoomDto } from "./dto/create-room.dto";

@Controller("api/rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(JwtAccessGuard)
  @Get()
  listRooms() {
    return this.roomsService.listRooms();
  }

  @UseGuards(JwtAccessGuard)
  @Post()
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto.name);
  }
}
