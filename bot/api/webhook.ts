import { webhookCallback } from "grammy";

import { env } from "../src/config/env.js";
import { bot, ensureBotConfigured } from "../src/index.js";

const callback = webhookCallback(bot, "http");

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const header = req.headers["x-telegram-bot-api-secret-token"];
    const secret = Array.isArray(header) ? header[0] : header;
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      res.status(401).json({ message: "Unauthorized webhook request." });
      return;
    }
  }

  await ensureBotConfigured();
  await callback(req, res);
}
