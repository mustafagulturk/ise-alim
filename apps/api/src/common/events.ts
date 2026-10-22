import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { config } from "./config";

export const EVENTS_CHANNEL = "kadro:events";

export interface LiveEvent {
  companyId: string;
  type: "application.created" | "application.updated" | "application.moved" | "application.scored" | "activity.created" | "interview.booked";
  jobId?: string;
  applicationId?: string;
  actorId?: string;
  data?: Record<string, unknown>;
}

/**
 * API ve worker ayrı süreçler olduğu için canlı olaylar Redis pub/sub üzerinden taşınır.
 * Worker CV puanlamasını bitirince yayınlar, API'deki WebSocket geçidi şirketin odasına iletir.
 */
@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly redis = new Redis(config().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });

  async publish(event: LiveEvent) {
    try {
      if (this.redis.status === "wait") await this.redis.connect();
      await this.redis.publish(EVENTS_CHANNEL, JSON.stringify(event));
    } catch {
      // Canlı güncelleme kaybı kritik değil; istemci bir sonraki yenilemede veriyi zaten alır.
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}

@Global()
@Module({ providers: [EventsService], exports: [EventsService] })
export class EventsModule {}
