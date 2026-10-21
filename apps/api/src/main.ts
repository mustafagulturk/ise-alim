import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { config } from "./common/config";

export function configure(app: NestExpressApplication) {
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.enableCors({ origin: config().WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = configure(await NestFactory.create<NestExpressApplication>(AppModule));
  await app.listen(config().PORT);
  Logger.log(`API http://localhost:${config().PORT}/api (yapay zekâ: ${config().ANTHROPIC_API_KEY ? "Claude" : "yerel puanlayıcı"})`, "Kadro");
}

if (require.main === module) void bootstrap();
