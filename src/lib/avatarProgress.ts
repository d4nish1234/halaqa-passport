const LEVEL_THRESHOLDS = [0, 1, 3, 5, 8, 11, 14, 18, 22, 26, 30];
const EXTRA_LEVEL_STEP = 2;

export function getAvatarLevelProgress(totalCheckIns: number) {
  const total = Math.max(0, Math.floor(totalCheckIns));
  const baseMaxLevel = LEVEL_THRESHOLDS.length - 1;
  const baseMaxCheckIns = LEVEL_THRESHOLDS[baseMaxLevel];

  if (total >= baseMaxCheckIns) {
    const extraLevels = Math.floor((total - baseMaxCheckIns) / EXTRA_LEVEL_STEP);
    const level = baseMaxLevel + extraLevels;
    const currentLevelAt = baseMaxCheckIns + extraLevels * EXTRA_LEVEL_STEP;
    const nextLevelAt = currentLevelAt + EXTRA_LEVEL_STEP;
    const progress =
      nextLevelAt > currentLevelAt
        ? (total - currentLevelAt) / (nextLevelAt - currentLevelAt)
        : 1;

    return { level, currentLevelAt, nextLevelAt, progress, total };
  }

  let level = 1;
  for (let i = baseMaxLevel; i >= 1; i -= 1) {
    if (total >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }

  const currentLevelAt = LEVEL_THRESHOLDS[level];
  const nextLevelAt = LEVEL_THRESHOLDS[level + 1] ?? currentLevelAt + EXTRA_LEVEL_STEP;
  const progress =
    nextLevelAt > currentLevelAt
      ? (total - currentLevelAt) / (nextLevelAt - currentLevelAt)
      : 1;

  return { level, currentLevelAt, nextLevelAt, progress, total };
}
