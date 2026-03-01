import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true
  }
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  async afterInit(server: Server) {
    if (!process.env.REDIS_HOST) {
      return;
    }

    const pubClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? 6379}`
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    server.adapter(createAdapter(pubClient, subClient));
  }
}
