/**
 * Daily Rewards System
 * - Track daily login streaks
 * - Progressive rewards
 * - Spin wheel mechanics
 */

export interface DailyReward {
  day: number;
  baseReward: number;
  multiplier: number;
  isClaimable: boolean;
  isClaimed: boolean;
  icon: string;
}

export interface DailyRewardsState {
  currentStreak: number;
  lastClaimDate: string | null;
  totalClaimsThisMonth: number;
  nextClaimTime: number;
  rewards: DailyReward[];
}

export function generateDailyRewards(): DailyReward[] {
  const baseReward = 500;
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    let multiplier = 1;
    let icon = "🎁";

    // Progressive multipliers
    if (day === 7) { multiplier = 2; icon = "⭐"; }
    else if (day === 14) { multiplier = 3; icon = "🌟"; }
    else if (day === 21) { multiplier = 4; icon = "✨"; }
    else if (day === 30) { multiplier = 5; icon = "👑"; }
    else if (day % 5 === 0) { multiplier = 1.5; icon = "🎉"; }

    return {
      day,
      baseReward,
      multiplier,
      reward: Math.floor(baseReward * multiplier),
      isClaimable: false,
      isClaimed: false,
      icon,
    };
  });
}

export function calculateNextClaimTime(lastClaimDate: string | null): number {
  if (!lastClaimDate) return 0;
  const last = new Date(lastClaimDate);
  const next = new Date(last);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return Math.max(0, next.getTime() - Date.now());
}

export function formatClaimCountdown(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
