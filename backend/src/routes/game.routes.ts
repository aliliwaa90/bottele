import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { getSocket } from "../lib/socket.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateCombo, calculateUpgradeCost, pointsToJetton, refillEnergy } from "../utils/game.js";
import { serializeUpgrade, serializeUser } from "../utils/serializers.js";
import { validateBody, validateQuery } from "../utils/validate.js";

const router = Router();

const tapSchema = z.object({
  taps: z.coerce.number().int().min(1).max(30)
});

const leaderboardSchema = z.object({
  type: z.enum(["global", "weekly", "friends"]).default("global"),
  limit: z.coerce.number().int().min(3).max(100).default(50)
});

const claimAirdropSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^[A-Za-z0-9\-_]{30,80}$/, "Invalid TON wallet address format.")
});

async function syncEconomy(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }

  const now = new Date();
  const elapsedEnergyMinutes = Math.max(0, Math.floor((now.getTime() - user.lastEnergyRefill.getTime()) / 60_000));
  const elapsedProfitSeconds = Math.max(0, Math.floor((now.getTime() - user.lastProfitAt.getTime()) / 1000));

  const newEnergy = refillEnergy(user.energy, user.maxEnergy, elapsedEnergyMinutes);
  const passiveGain = Math.floor((user.pph / 3600) * elapsedProfitSeconds);

  if (newEnergy !== user.energy || passiveGain > 0) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        energy: newEnergy,
        points: passiveGain > 0 ? { increment: BigInt(passiveGain) } : undefined,
        lastEnergyRefill: now,
        lastProfitAt: now
      }
    });
  }

  return user;
}

async function emitLeaderboardUpdate() {
  const topUsers = await prisma.user.findMany({
    take: 20,
    orderBy: { points: "desc" },
    select: {
      id: true,
      username: true,
      firstName: true,
      points: true,
      totalTaps: true
    }
  });

  getSocket().to("leaderboard:global").emit(
    "leaderboard:update",
    topUsers.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.username || user.firstName || "VaultTaper",
      points: user.points.toString(),
      totalTaps: user.totalTaps.toString()
    }))
  );
}

router.use(requireAuth);

router.get("/me", async (req, res) => {
  const userId = req.auth!.userId;
  const user = await syncEconomy(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  const [upgrades, userUpgrades, activeEvents] = await Promise.all([
    prisma.upgrade.findMany({ orderBy: { baseCost: "asc" } }),
    prisma.userUpgrade.findMany({ where: { userId } }),
    prisma.specialEvent.findMany({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() }
      }
    })
  ]);

  const upgradesById = new Map(userUpgrades.map((entry) => [entry.upgradeId, entry]));
  const upgradeList = upgrades.map((upgrade) => {
    const current = upgradesById.get(upgrade.id);
    const level = current?.level ?? 0;
    return {
      ...serializeUpgrade(upgrade),
      currentLevel: level,
      nextCost: level < upgrade.maxLevel ? calculateUpgradeCost(upgrade.baseCost, level) : null
    };
  });

  const directReferrals = await prisma.user.count({ where: { referredById: user.id } });

  res.status(StatusCodes.OK).json({
    user: serializeUser(user),
    upgrades: upgradeList,
    activeEvents,
    referral: {
      directReferrals,
      referralCode: user.referralCode
    }
  });
});

router.post("/tap", validateBody(tapSchema), async (req, res) => {
  const userId = req.auth!.userId;
  const synced = await syncEconomy(userId);
  if (!synced) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  if (synced.energy <= 0) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Energy depleted." });
    return;
  }

  const tapsRequested = (req.body as z.infer<typeof tapSchema>).taps;
  const realTaps = Math.min(tapsRequested, synced.energy);

  const combo = calculateCombo(synced.lastTapAt, synced.comboCount);
  const activeEvent = await prisma.specialEvent.findFirst({
    where: {
      isActive: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() }
    },
    orderBy: { multiplier: "desc" }
  });
  const eventMultiplier = activeEvent?.multiplier ?? 1;
  const pointsPerTap = synced.tapPower * combo.comboMultiplier * eventMultiplier;
  const pointsEarned = Math.floor(pointsPerTap * realTaps);

  const updated = await prisma.user.update({
    where: { id: synced.id },
    data: {
      points: { increment: BigInt(pointsEarned) },
      energy: { decrement: realTaps },
      totalTaps: { increment: BigInt(realTaps) },
      comboCount: combo.comboCount,
      comboMultiplier: combo.comboMultiplier,
      lastTapAt: new Date()
    }
  });

  await prisma.tapEvent.create({
    data: {
      userId: updated.id,
      taps: realTaps,
      pointsEarned,
      comboMultiplier: combo.comboMultiplier
    }
  });

  getSocket().to(`user:${updated.id}`).emit("user:update", serializeUser(updated));
  await emitLeaderboardUpdate();

  res.status(StatusCodes.OK).json({
    message: "Tap recorded.",
    pointsEarned,
    comboMultiplier: combo.comboMultiplier,
    eventMultiplier,
    user: serializeUser(updated)
  });
});

router.post("/upgrades/:upgradeId/buy", async (req, res) => {
  const userId = req.auth!.userId;
  const upgradeId = req.params.upgradeId;
  const user = await syncEconomy(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  const upgrade = await prisma.upgrade.findUnique({ where: { id: upgradeId } });
  if (!upgrade) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Upgrade not found." });
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

  const cost = calculateUpgradeCost(upgrade.baseCost, currentLevel);
  if (user.points < BigInt(cost)) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Not enough points." });
    return;
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        points: { decrement: BigInt(cost) },
        pph: { increment: upgrade.pphBoost },
        tapPower: { increment: upgrade.tapBoost },
        maxEnergy: { increment: upgrade.energyBoost },
        energy: { increment: upgrade.energyBoost }
      }
    }),
    prisma.userUpgrade.upsert({
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
    })
  ]);

  getSocket().to(`user:${updatedUser.id}`).emit("user:update", serializeUser(updatedUser));

  res.status(StatusCodes.OK).json({
    message: "Upgrade purchased.",
    cost,
    user: serializeUser(updatedUser)
  });
});

router.get("/leaderboard", validateQuery(leaderboardSchema), async (req, res) => {
  const { type, limit } = req.query as unknown as z.infer<typeof leaderboardSchema>;
  const userId = req.auth!.userId;

  if (type === "global") {
    const users = await prisma.user.findMany({
      orderBy: { points: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        firstName: true,
        points: true,
        totalTaps: true
      }
    });
    res.json(
      users.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.username || user.firstName || "VaultTaper",
        points: user.points.toString(),
        totalTaps: user.totalTaps.toString()
      }))
    );
    return;
  }

  if (type === "weekly") {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await prisma.tapEvent.findMany({
      where: { createdAt: { gte: from } },
      select: { userId: true, pointsEarned: true }
    });
    const scoreByUser = new Map<string, number>();
    for (const event of events) {
      const current = scoreByUser.get(event.userId) ?? 0;
      scoreByUser.set(event.userId, current + event.pointsEarned);
    }
    const ranked = [...scoreByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, pointsEarned]) => ({ userId, pointsEarned }));
    const users = await prisma.user.findMany({
      where: { id: { in: ranked.map((event) => event.userId) } },
      select: { id: true, username: true, firstName: true }
    });
    const userMap = new Map(users.map((item) => [item.id, item]));
    res.json(
      ranked.map((event, index) => ({
        rank: index + 1,
        id: event.userId,
        name: userMap.get(event.userId)?.username || userMap.get(event.userId)?.firstName || "VaultTaper",
        points: String(event.pointsEarned)
      }))
    );
    return;
  }

  const directReferrals = await prisma.user.findMany({
    where: { referredById: userId },
    select: { id: true }
  });
  const friendIds = [userId, ...directReferrals.map((item) => item.id)];
  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    orderBy: { points: "desc" },
    take: limit,
    select: { id: true, username: true, firstName: true, points: true }
  });
  res.json(
    friends.map((friend, index) => ({
      rank: index + 1,
      id: friend.id,
      name: friend.username || friend.firstName || "VaultTaper",
      points: friend.points.toString()
    }))
  );
});

router.get("/referrals", async (req, res) => {
  const userId = req.auth!.userId;
  const level1 = await prisma.user.findMany({
    where: { referredById: userId },
    select: { id: true, username: true, firstName: true, points: true, createdAt: true }
  });
  const level1Ids = level1.map((user) => user.id);
  const level2Count = level1Ids.length
    ? await prisma.user.count({
        where: { referredById: { in: level1Ids } }
      })
    : 0;

  res.json({
    level1Count: level1.length,
    level2Count,
    estimatedRewards: level1.length * 2000 + level2Count * 500,
    referrals: level1.map((item) => ({
      id: item.id,
      name: item.username || item.firstName || "VaultTaper",
      points: item.points.toString(),
      joinedAt: item.createdAt
    }))
  });
});

router.post("/claim-airdrop", validateBody(claimAirdropSchema), async (req, res) => {
  const userId = req.auth!.userId;
  const payload = req.body as z.infer<typeof claimAirdropSchema>;
  const user = await syncEconomy(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  if (user.points < BigInt(10000)) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Minimum 10,000 points required for claim." });
    return;
  }

  const tokenAmount = pointsToJetton(user.points);
  const batchTag = `manual-${new Date().toISOString().slice(0, 10)}`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { walletAddress: payload.walletAddress }
    }),
    prisma.airdropSnapshot.create({
      data: {
        userId: user.id,
        points: user.points,
        tokenAmount,
        batchTag
      }
    })
  ]);

  res.status(StatusCodes.OK).json({
    message: "Airdrop claim request queued.",
    walletAddress: payload.walletAddress,
    points: user.points.toString(),
    estimatedJetton: tokenAmount
  });
});

export default router;
