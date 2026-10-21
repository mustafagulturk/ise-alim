import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import Redis from "ioredis";
import type { Server, Socket } from "socket.io";
import type { AccessPayload } from "../common/auth";
import { config } from "../common/config";
import { EVENTS_CHANNEL, type LiveEvent } from "../common/events";

/**
 * Her kullanıcı şirketinin odasına katılır. Redis'ten gelen olaylar (API ya da worker kaynaklı)
 * odaya iletilir; panel ilgili sorguları yeniler. Kanban'da başka bir kullanıcı kart taşıdığında anında görünür.
 */
@WebSocketGateway({ path: "/api/live", cors: { origin: config().WEB_ORIGIN, credentials: true } })
export class LiveGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger(LiveGateway.name);
  private readonly sub = new Redis(config().REDIS_URL, { lazyConnect: true });

  constructor(private readonly jwt: JwtService) {}

  async onModuleInit() {
    try {
      await this.sub.connect();
      await this.sub.subscribe(EVENTS_CHANNEL);
      this.sub.on("message", (_channel, raw) => {
        const event = JSON.parse(raw) as LiveEvent;
        this.server?.to(`company:${event.companyId}`).emit("event", event);
      });
    } catch (e) {
      this.log.warn(`Canlı güncellemeler kapalı: ${String(e)}`);
    }
  }

  onModuleDestroy() {
    this.sub.disconnect();
  }

  handleConnection(client: Socket) {
    try {
      const token = String(client.handshake.auth?.token ?? "");
      const p = this.jwt.verify<AccessPayload>(token);
      client.data.userId = p.sub;
      void client.join(`company:${p.cid}`);
    } catch {
      client.emit("unauthorized");
      client.disconnect(true);
    }
  }
}
