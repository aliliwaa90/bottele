export function calculateUpgradeCost(
  baseCost: number,
  currentLevel: number,
  difficulty = 1.08,
  maxLevel = 105
): number {
  const nextLevel = currentLevel + 1;
  const normalized = nextLevel / Math.max(20, maxLevel);
  const curve = Math.pow(nextLevel, 1.34) * (1 + normalized * 1.7);
  const exponential = Math.pow(difficulty, Math.max(0, nextLevel - 1));
  return Math.max(1, Math.floor(baseCost * curve * exponential));
}

export function refillEnergy(current: number, max: number, elapsedMinutes: number): number {
  const restored = Math.floor(elapsedMinutes * 10);
  return Math.min(max, current + restored);
}

export function calculateCombo(
  lastTapAt: Date | null,
  previousComboCount: number
): { comboCount: number; comboMultiplier: number } {
  if (!lastTapAt) {
    return { comboCount: 1, comboMultiplier: 1 };
  }
  const now = Date.now();
  const diffMs = now - lastTapAt.getTime();
  if (diffMs <= 2000) {
    const comboCount = Math.min(100, previousComboCount + 1);
    return {
      comboCount,
      comboMultiplier: Math.min(3.5, 1 + comboCount * 0.03)
    };
  }
  return { comboCount: 1, comboMultiplier: 1 };
}

export function pointsToJetton(points: bigint): number {
  return Number(points) / 1000;
}
