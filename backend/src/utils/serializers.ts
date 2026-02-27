import type { Task, Upgrade, User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    language: user.language,
    role: user.role,
    points: user.points.toString(),
    energy: user.energy,
    maxEnergy: user.maxEnergy,
    tapPower: user.tapPower,
    comboCount: user.comboCount,
    comboMultiplier: user.comboMultiplier,
    pph: user.pph,
    totalTaps: user.totalTaps.toString(),
    walletAddress: user.walletAddress,
    referralCode: user.referralCode,
    referredById: user.referredById,
    lastTapAt: user.lastTapAt,
    lastEnergyRefill: user.lastEnergyRefill,
    lastProfitAt: user.lastProfitAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function serializeUpgrade(upgrade: Upgrade) {
  return {
    id: upgrade.id,
    key: upgrade.key,
    titleAr: upgrade.titleAr,
    titleEn: upgrade.titleEn,
    descriptionAr: upgrade.descriptionAr,
    descriptionEn: upgrade.descriptionEn,
    baseCost: upgrade.baseCost,
    maxLevel: upgrade.maxLevel,
    pphBoost: upgrade.pphBoost,
    tapBoost: upgrade.tapBoost,
    energyBoost: upgrade.energyBoost
  };
}

export function serializeTask(task: Task) {
  return {
    id: task.id,
    key: task.key,
    titleAr: task.titleAr,
    titleEn: task.titleEn,
    type: task.type,
    reward: task.reward,
    link: task.link,
    isDaily: task.isDaily,
    isActive: task.isActive
  };
}
