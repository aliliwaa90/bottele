import { env } from "../src/config/env.js";
import { bot, ensureBotConfigured } from "../src/index.js";

const setupKey = process.env.BOT_SETUP_KEY ?? "";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  if (setupKey) {
    const key = req.query.key;
    const provided = Array.isArray(key) ? key[0] : key;
    if (!provided || provided !== setupKey) {
      res.status(401).json({ message: "Invalid setup key." });
      return;
    }
  }

  if (!env.TELEGRAM_WEBHOOK_URL) {
    res.status(400).json({
      message: "TELEGRAM_WEBHOOK_URL is required to register Telegram webhook."
    });
    return;
  }

  await ensureBotConfigured();
  await bot.api.setWebhook(env.TELEGRAM_WEBHOOK_URL, {
    secret_token: env.TELEGRAM_WEBHOOK_SECRET || undefined,
    drop_pending_updates: true
  });

  res.status(200).json({
    message: "Webhook registered.",
    url: env.TELEGRAM_WEBHOOK_URL
  });
}
