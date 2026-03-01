import { Controller, Get, NotFoundException, Req, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { UsersService } from "./users.service";

@Controller("api/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAccessGuard)
  async getProfile(@Req() req: { user?: { sub?: string } }) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new NotFoundException("User not found");
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { id: user.id, username: user.username, role: user.role };
  }
}
