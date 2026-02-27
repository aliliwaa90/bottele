import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken, generateReferralCode } from "../utils/auth.js";
import { serializeUser } from "../utils/serializers.js";
import { verifyTelegramInitData } from "../utils/telegram.js";
import { validateBody } from "../utils/validate.js";

const router = Router();

const loginSchema = z.object({
  telegramId: z.union([z.string(), z.number(), z.bigint()]).optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  language: z.string().default("ar"),
  referralCode: z.string().min(4).max(32).optional(),
  initData: z.string().optional()
});

router.post("/telegram", validateBody(loginSchema), async (req, res) => {
  const payload = req.body as z.infer<typeof loginSchema>;

  if (payload.initData && !env.TELEGRAM_BOT_TOKEN) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Backend is missing TELEGRAM_BOT_TOKEN for initData verification."
    });
    return;
  }

  const verifiedInitData = payload.initData
    ? verifyTelegramInitData(
        payload.initData,
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_INITDATA_MAX_AGE_SECONDS
      )
    : null;

  if (payload.initData && !verifiedInitData) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Invalid Telegram initData."
    });
    return;
  }

  if (env.TELEGRAM_LOGIN_REQUIRED && !verifiedInitData) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Telegram initData is required for login."
    });
    return;
  }

  const profile = {
    telegramId: verifiedInitData
      ? BigInt(verifiedInitData.user.id)
      : payload.telegramId
        ? BigInt(payload.telegramId)
        : null,
    username: verifiedInitData?.user.username ?? payload.username,
    firstName: verifiedInitData?.user.first_name ?? payload.firstName,
    lastName: verifiedInitData?.user.last_name ?? payload.lastName,
    language: verifiedInitData?.user.language_code ?? payload.language ?? "ar"
  };

  if (!profile.telegramId) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: "telegramId is required."
    });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { telegramId: profile.telegramId }
  });

  let user = existing;

  if (!user) {
    let referredById: string | undefined;
    if (payload.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: payload.referralCode }
      });
      referredById = referrer?.id;
    }

    let referralCode = generateReferralCode(profile.telegramId);
    let checkCode = await prisma.user.findUnique({ where: { referralCode } });
    while (checkCode) {
      referralCode = generateReferralCode(profile.telegramId);
      checkCode = await prisma.user.findUnique({ where: { referralCode } });
    }

    user = await prisma.user.create({
      data: {
        telegramId: profile.telegramId,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        language: profile.language,
        referralCode,
        referredById
      }
    });

    if (referredById) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: referredById },
          data: { points: { increment: BigInt(2000) } }
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: BigInt(1000) } }
        })
      ]);
      user = (await prisma.user.findUnique({ where: { id: user.id } })) ?? user;
    }
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: profile.username ?? user.username,
        firstName: profile.firstName ?? user.firstName,
        lastName: profile.lastName ?? user.lastName,
        language: profile.language || user.language
      }
    });
  }

  const token = signToken({
    userId: user.id,
    role: user.role
  });

  res.status(StatusCodes.OK).json({
    token,
    user: serializeUser(user)
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth?.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  res.status(StatusCodes.OK).json({ user: serializeUser(user) });
});

export default router;
