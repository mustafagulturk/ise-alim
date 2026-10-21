import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(8),
  STORAGE_DIR: z.string().default("./storage"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | undefined;

/** Ortam değişkenlerini bir kez doğrular; eksik ayar varsa uygulama açılmadan hata verir. */
export function config(): AppConfig {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      throw new Error(`Geçersiz ortam ayarı: ${issues}`);
    }
    cached = { ...parsed.data, ANTHROPIC_API_KEY: parsed.data.ANTHROPIC_API_KEY || undefined };
  }
  return cached;
}
