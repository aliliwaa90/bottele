import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_WEBAPP_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  BOT_API_KEY: z.string().optional().default(""),
  DEFAULT_LANGUAGE: z.string().default("ar")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid bot environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
