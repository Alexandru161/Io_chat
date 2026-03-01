import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { UsersService } from "../users/users.service";
import { RefreshToken } from "../entities/refresh-token.entity";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) {
      throw new BadRequestException("Username already taken");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser(dto.username, passwordHash);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.isBanned) {
      throw new ForbiddenException("User is banned");
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshDto, userId?: string) {
    if (!userId) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (user.isBanned) {
      throw new ForbiddenException("User is banned");
    }

    const storedTokens = await this.refreshTokenRepo.find({
      where: { user: { id: user.id } },
      relations: ["user"]
    });

    const now = Date.now();
    let match: RefreshToken | undefined;
    for (const token of storedTokens) {
      if (token.expiresAt.getTime() <= now) {
        continue;
      }

      const isMatch = await bcrypt.compare(dto.refreshToken, token.tokenHash);
      if (isMatch) {
        match = token;
        break;
      }
    }

    if (!match) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.refreshTokenRepo.delete({ user: { id: user.id } });
    return this.issueTokens(user);
  }

  private async issueTokens(user: { id: string; username: string; role: string }) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m"
      }
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d"
      }
    );

    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role }
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshMs = this.parseDurationToMs(
      process.env.JWT_REFRESH_EXPIRES_IN,
      7 * 24 * 60 * 60 * 1000
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + refreshMs);

    const entity = this.refreshTokenRepo.create({
      tokenHash,
      expiresAt,
      user: { id: userId }
    });

    await this.refreshTokenRepo.save(entity);
  }

  private parseDurationToMs(value: string | undefined, fallbackMs: number) {
    if (!value) {
      return fallbackMs;
    }

    const match = value.trim().match(/^(\d+)([smhd])$/);
    if (!match) {
      return fallbackMs;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case "s":
        return amount * 1000;
      case "m":
        return amount * 60 * 1000;
      case "h":
        return amount * 60 * 60 * 1000;
      case "d":
        return amount * 24 * 60 * 60 * 1000;
      default:
        return fallbackMs;
    }
  }
}
