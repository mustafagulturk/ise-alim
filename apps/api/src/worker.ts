import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { config } from "./common/config";
import { WorkerModule } from "./worker.module";

/** Kuyruk işçisi API'den ayrı süreçte çalışır; yoğun CV puanlaması API yanıt süresini etkilemez. */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log(`Worker çalışıyor (puanlayıcı: ${config().ANTHROPIC_API_KEY ? "Claude" : "yerel"})`, "Kadro");
}

void bootstrap();
