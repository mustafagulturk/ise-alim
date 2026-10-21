process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/kadro_test";
process.env.REDIS_URL ??= "redis://localhost:6379/1";
process.env.JWT_SECRET ??= "test-secret-123";
process.env.STORAGE_DIR = "./storage-test";
delete process.env.ANTHROPIC_API_KEY;
