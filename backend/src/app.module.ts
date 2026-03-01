import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RoomsModule } from "./rooms/rooms.module";
import { MessagesModule } from "./messages/messages.module";
import { AdminModule } from "./admin/admin.module";
import { RedisModule } from "./redis/redis.module";
import { ChatGateway } from "./gateway/chat.gateway";
import { LoggingMiddleware } from "./common/logging.middleware";
import { User } from "./entities/user.entity";
import { Room } from "./entities/room.entity";
import { Message } from "./entities/message.entity";
import { RoomMember } from "./entities/room-member.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== "production"
    }),
    TypeOrmModule.forFeature([User, Room, Message, RoomMember, RefreshToken]),
    AuthModule,
    RedisModule,
    UsersModule,
    RoomsModule,
    MessagesModule,
    AdminModule
  ],
  controllers: [HealthController],
  providers: [
    ChatGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes("*");
  }
}
