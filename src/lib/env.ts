import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET en az 32 karakter olmali"),
  SESSION_COOKIE_NAME: z.string().default("erp_session"),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(480),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_MINUTES: process.env.SESSION_TTL_MINUTES,
  APP_URL: process.env.APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

export const isProd = env.NODE_ENV === "production";
