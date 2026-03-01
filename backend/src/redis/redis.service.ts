import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient | null = null;
  private readonly logger = new Logger(RedisService.name);

  async onModuleInit() {
    if (!process.env.REDIS_HOST) {
      return;
    }

    const url = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? 6379}`;
    const client = createClient({ url });
    client.on("error", (error) => {
      this.logger.warn(`Redis error: ${String(error)}`);
    });

    try {
      await client.connect();
      this.client = client;
      this.logger.log("Redis connected");
    } catch (error) {
      this.logger.warn(`Redis connection failed: ${String(error)}`);
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  isReady() {
    return Boolean(this.client?.isOpen);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client?.isOpen) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Redis get failed: ${String(error)}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = 60) {
    if (!this.client?.isOpen) {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      this.logger.warn(`Redis set failed: ${String(error)}`);
    }
  }

  async del(key: string) {
    if (!this.client?.isOpen) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis delete failed: ${String(error)}`);
    }
  }
}
