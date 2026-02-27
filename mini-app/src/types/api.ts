export type User = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  language: string;
  role: "USER" | "ADMIN";
  points: string;
  energy: number;
  maxEnergy: number;
  tapPower: number;
  comboCount: number;
  comboMultiplier: number;
  pph: number;
  totalTaps: string;
  referralCode: string;
  walletAddress?: string | null;
};

export type Upgrade = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  baseCost: number;
  maxLevel: number;
  pphBoost: number;
  tapBoost: number;
  energyBoost: number;
  currentLevel: number;
  nextCost: number | null;
};

export type Task = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string;
  type: "DAILY" | "SOCIAL" | "CIPHER" | "SPECIAL";
  reward: number;
  link?: string | null;
  isDaily: boolean;
  isActive: boolean;
  isClaimed: boolean;
  claimedAt?: string | null;
};

export type LeaderboardItem = {
  rank: number;
  id: string;
  name: string;
  points: string;
  totalTaps?: string;
};
