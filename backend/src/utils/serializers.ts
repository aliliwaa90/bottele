type SerializableUser = {
  id: string;
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  language: string;
  role: string;
  points: bigint;
  energy: number;
  maxEnergy: number;
  tapPower: number;
  comboCount: number;
  comboMultiplier: number;
  pph: number;
  autoTapPerHour: number;
  starsSpent: number;
  totalTaps: bigint;
  walletAddress: string | null;
  referralCode: string;
  referredById: string | null;
  lastTapAt: Date | null;
  lastEnergyRefill: Date;
  lastProfitAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type SerializableUpgrade = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  imageUrl: string | null;
  category: string;
  baseCost: number;
  maxLevel: number;
  difficulty: number;
  unlockLevel: number;
  starsPrice: number | null;
  pphBoost: number;
  tapBoost: number;
  energyBoost: number;
  autoTapBoost: number;
};

type SerializableTask = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  type: string;
  reward: number;
  link: string | null;
  isDaily: boolean;
  isActive: boolean;
};

export function serializeUser(user: SerializableUser) {
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
    autoTapPerHour: user.autoTapPerHour,
    starsSpent: user.starsSpent,
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

export function serializeUpgrade(upgrade: SerializableUpgrade) {
  return {
    id: upgrade.id,
    key: upgrade.key,
    titleAr: upgrade.titleAr,
    titleEn: upgrade.titleEn,
    descriptionAr: upgrade.descriptionAr,
    descriptionEn: upgrade.descriptionEn,
    icon: upgrade.icon,
    imageUrl: upgrade.imageUrl,
    category: upgrade.category,
    baseCost: upgrade.baseCost,
    maxLevel: upgrade.maxLevel,
    difficulty: upgrade.difficulty,
    unlockLevel: upgrade.unlockLevel,
    starsPrice: upgrade.starsPrice,
    pphBoost: upgrade.pphBoost,
    tapBoost: upgrade.tapBoost,
    energyBoost: upgrade.energyBoost,
    autoTapBoost: upgrade.autoTapBoost
  };
}

export function serializeTask(task: SerializableTask) {
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
