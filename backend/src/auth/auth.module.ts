import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { UsersModule } from "../users/users.module";
import { RefreshToken } from "../entities/refresh-token.entity";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken])
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService]
})
export class AuthModule {}
