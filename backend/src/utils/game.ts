export function calculateUpgradeCost(baseCost: number, currentLevel: number): number {
  const nextLevel = currentLevel + 1;
  const scaled = baseCost * Math.pow(nextLevel, 1.32);
  return Math.floor(scaled);
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
