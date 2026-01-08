export function normalizeRewards(input: unknown): number[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const values = input
    .map((value) => (typeof value === 'number' ? Math.floor(value) : Number.NaN))
    .filter((value) => Number.isFinite(value) && value > 0);

  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function getRewardStatus({
  rewards,
  claimedRewards,
  sessionsAttended,
}: {
  rewards?: number[];
  claimedRewards?: number[];
  sessionsAttended: number;
}) {
  const thresholds = normalizeRewards(rewards);
  if (!thresholds.length) {
    return null;
  }

  const claimed = new Set(
    Array.isArray(claimedRewards) ? claimedRewards : []
  );
  const nextReward = thresholds.find((value) => !claimed.has(value)) ?? null;
  const allClaimed = nextReward === null;
  const target = nextReward ?? thresholds[thresholds.length - 1];
  const progress = target ? Math.min(sessionsAttended, target) / target : 0;
  const canClaim = nextReward !== null && sessionsAttended >= nextReward;

  return {
    target,
    progress,
    canClaim,
    allClaimed,
    currentCount: Math.min(sessionsAttended, target),
  };
}
