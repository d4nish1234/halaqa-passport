export function getAvatarLevelProgress(totalCheckIns: number) {
  const total = Math.max(0, Math.floor(totalCheckIns));

  let level = 1;
  let currentLevelAt = 0;
  let nextLevelAt = 1;

  if (total >= 1) {
    level = 2;
    currentLevelAt = 1;
    nextLevelAt = 3;

    if (total >= nextLevelAt) {
      const levels2to5 = Math.floor((total - 1) / 2);
      level = Math.min(5, 2 + levels2to5);
      currentLevelAt = 1 + (level - 2) * 2;
      nextLevelAt = currentLevelAt + 2;

      if (level >= 5 && total >= nextLevelAt) {
        const extraLevels = Math.floor((total - nextLevelAt) / 3) + 1;
        level = 5 + extraLevels;
        currentLevelAt = nextLevelAt + (extraLevels - 1) * 3;
        nextLevelAt = currentLevelAt + 3;
      }
    }
  }

  const progress =
    nextLevelAt > currentLevelAt
      ? (total - currentLevelAt) / (nextLevelAt - currentLevelAt)
      : 1;

  return { level, currentLevelAt, nextLevelAt, progress, total };
}
