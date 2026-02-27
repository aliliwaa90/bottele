import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BACKEND_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  BOT_API_KEY: z.string().optional().default(""),
  TELEGRAM_LOGIN_REQUIRED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  TELEGRAM_INITDATA_MAX_AGE_SECONDS: z.coerce.number().default(86_400),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000"),
  SOCKET_CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
