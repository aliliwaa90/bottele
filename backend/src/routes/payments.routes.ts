import { Router, type Request } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getSocket } from "../lib/socket.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../utils/serializers.js";
import { validateBody } from "../utils/validate.js";

const router = Router();

const createInvoiceSchema = z.object({
  upgradeKey: z.string().min(2).max(64)
});

const confirmStarsSchema = z.object({
  telegramId: z.union([z.string(), z.number(), z.bigint()]),
  telegramPaymentChargeId: z.string().min(8),
  providerPaymentChargeId: z.string().optional(),
  payload: z.string().min(1),
  totalAmount: z.coerce.number().int().min(1)
});

type ParsedReward =
  | { type: "upgrade"; upgradeKey: string }
  | { type: "points"; points: number };

function parseRewardPayload(rawPayload: string, totalStars: number): ParsedReward {
  const fallbackPoints = totalStars * 250;

  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
    if (parsed.type === "upgrade" && typeof parsed.upgradeKey === "string" && parsed.upgradeKey) {
      return { type: "upgrade", upgradeKey: parsed.upgradeKey };
    }
    if (parsed.type === "points") {
      const points = Number(parsed.points);
      if (Number.isFinite(points) && points > 0) {
        return { type: "points", points: Math.floor(points) };
      }
    }
  } catch {
    // Fallback parsing below.
  }

  if (rawPayload.startsWith("upgrade:")) {
    const upgradeKey = rawPayload.slice("upgrade:".length).trim();
    if (upgradeKey) {
      return { type: "upgrade", upgradeKey };
    }
  }

  const numericPayload = Number(rawPayload);
  if (Number.isFinite(numericPayload) && numericPayload > 0) {
    return { type: "points", points: Math.floor(numericPayload) };
  }

  return { type: "points", points: fallbackPoints };
}

function isTrustedBotRequest(req: Request): boolean {
  const botApiKeyHeaderRaw = req.headers["x-bot-api-key"];
  const botApiKeyHeader = Array.isArray(botApiKeyHeaderRaw)
    ? botApiKeyHeaderRaw[0]
    : botApiKeyHeaderRaw;
  const botTokenHeaderRaw = req.headers["x-bot-token"];
  const botTokenHeader = Array.isArray(botTokenHeaderRaw)
    ? botTokenHeaderRaw[0]
    : botTokenHeaderRaw;

  return (
    (Boolean(env.BOT_API_KEY) && botApiKeyHeader === env.BOT_API_KEY) ||
    (Boolean(env.TELEGRAM_BOT_TOKEN) && botTokenHeader === env.TELEGRAM_BOT_TOKEN)
  );
}

router.post("/telegram-stars/invoice", requireAuth, validateBody(createInvoiceSchema), async (req, res) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "TELEGRAM_BOT_TOKEN is missing on backend."
    });
    return;
  }

  const userId = req.auth!.userId;
  const payload = req.body as z.infer<typeof createInvoiceSchema>;

  const [user, upgrade] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.upgrade.findUnique({ where: { key: payload.upgradeKey } })
  ]);

  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  if (!upgrade || !upgrade.starsPrice || upgrade.starsPrice <= 0) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "This upgrade does not support Stars." });
    return;
  }

  const userUpgrade = await prisma.userUpgrade.findUnique({
    where: {
      userId_upgradeId: {
        userId: user.id,
        upgradeId: upgrade.id
      }
    }
  });
  const currentLevel = userUpgrade?.level ?? 0;
  if (currentLevel >= upgrade.maxLevel) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Upgrade reached max level." });
    return;
  }

  const invoicePayload = JSON.stringify({
    type: "upgrade",
    upgradeKey: upgrade.key,
    userId: user.id,
    ts: Date.now()
  });

  const title = user.language === "ar" ? `ترقية ${upgrade.titleAr}` : `Upgrade ${upgrade.titleEn}`;
  const description =
    user.language === "ar"
      ? `شراء ترقية ${upgrade.titleAr} داخل التطبيق باستخدام نجوم تيليجرام.`
      : `Purchase ${upgrade.titleEn} directly inside app using Telegram Stars.`;

  const tgResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        payload: invoicePayload,
        currency: "XTR",
        prices: [{ label: title, amount: upgrade.starsPrice }]
      })
    }
  );

  const tgData = (await tgResponse.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: string;
    description?: string;
  };

  if (!tgResponse.ok || !tgData.ok || !tgData.result) {
    res.status(StatusCodes.BAD_GATEWAY).json({
      message: tgData.description || "Failed to create Telegram Stars invoice."
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    invoiceLink: tgData.result,
    starsPrice: upgrade.starsPrice,
    upgradeKey: upgrade.key
  });
});

router.post("/telegram-stars/confirm", validateBody(confirmStarsSchema), async (req, res) => {
  if (!isTrustedBotRequest(req)) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized bot request." });
    return;
  }

  const payload = req.body as z.infer<typeof confirmStarsSchema>;
  const telegramId = BigInt(payload.telegramId);

  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found for payment confirmation." });
    return;
  }

  const existing = await prisma.starsPurchase.findUnique({
    where: { telegramPaymentChargeId: payload.telegramPaymentChargeId }
  });
  if (existing) {
    res.status(StatusCodes.OK).json({
      message: "Payment already processed.",
      alreadyProcessed: true
    });
    return;
  }

  const reward = parseRewardPayload(payload.payload, payload.totalAmount);

  if (reward.type === "upgrade") {
    const upgrade = await prisma.upgrade.findUnique({ where: { key: reward.upgradeKey } });
    if (!upgrade || !upgrade.starsPrice || upgrade.starsPrice <= 0) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Upgrade is not available for stars purchase." });
      return;
    }

    const userUpgrade = await prisma.userUpgrade.findUnique({
      where: {
        userId_upgradeId: {
          userId: user.id,
          upgradeId: upgrade.id
        }
      }
    });
    const currentLevel = userUpgrade?.level ?? 0;
    if (currentLevel >= upgrade.maxLevel) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "Upgrade reached max level." });
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const changedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          pph: { increment: upgrade.pphBoost },
          tapPower: { increment: upgrade.tapBoost },
          maxEnergy: { increment: upgrade.energyBoost },
          energy: { increment: upgrade.energyBoost },
          autoTapPerHour: { increment: upgrade.autoTapBoost },
          starsSpent: { increment: payload.totalAmount }
        }
      });

      await tx.userUpgrade.upsert({
        where: {
          userId_upgradeId: {
            userId: user.id,
            upgradeId: upgrade.id
          }
        },
        update: {
          level: { increment: 1 }
        },
        create: {
          userId: user.id,
          upgradeId: upgrade.id,
          level: 1
        }
      });

      await tx.starsPurchase.create({
        data: {
          userId: user.id,
          telegramPaymentChargeId: payload.telegramPaymentChargeId,
          providerPaymentChargeId: payload.providerPaymentChargeId,
          payload: payload.payload,
          stars: payload.totalAmount,
          rewardType: "UPGRADE",
          rewardValue: 1
        }
      });

      return changedUser;
    });

    const serialized = serializeUser(updatedUser);
    getSocket().to(`user:${updatedUser.id}`).emit("user:update", serialized);

    res.status(StatusCodes.OK).json({
      message: "Stars upgrade applied.",
      rewardType: "UPGRADE",
      rewardValue: 1,
      user: serialized
    });
    return;
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const changedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        points: { increment: BigInt(reward.points) },
        starsSpent: { increment: payload.totalAmount }
      }
    });

    await tx.starsPurchase.create({
      data: {
        userId: user.id,
        telegramPaymentChargeId: payload.telegramPaymentChargeId,
        providerPaymentChargeId: payload.providerPaymentChargeId,
        payload: payload.payload,
        stars: payload.totalAmount,
        rewardType: "POINTS",
        rewardValue: reward.points
      }
    });

    return changedUser;
  });

  const serialized = serializeUser(updatedUser);
  getSocket().to(`user:${updatedUser.id}`).emit("user:update", serialized);

  res.status(StatusCodes.OK).json({
    message: "Stars points credited.",
    rewardType: "POINTS",
    rewardValue: reward.points,
    user: serialized
  });
});

export default router;
