import { KidStats } from '../types';

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function weekKey(date: Date): number {
  return startOfWeek(date).getTime();
}

export function calculateStats(attendanceDates: Date[]): KidStats {
  if (attendanceDates.length === 0) {
    return {
      totalCheckIns: 0,
      currentStreak: 0,
      lastCheckInDate: null,
    };
  }

  const sorted = [...attendanceDates].sort((a, b) => b.getTime() - a.getTime());
  const lastCheckInDate = sorted[0].toLocaleDateString();

  const uniqueWeeks = Array.from(new Set(sorted.map((date) => weekKey(date))));
  uniqueWeeks.sort((a, b) => b - a);

  let currentStreak = 0;
  let cursor: number | null = null;

  for (const week of uniqueWeeks) {
    if (cursor === null) {
      currentStreak = 1;
      cursor = week;
      continue;
    }

    const expected = cursor - DAY_MS * 7;
    if (week === expected) {
      currentStreak += 1;
      cursor = week;
      continue;
    }

    break;
  }

  return {
    totalCheckIns: attendanceDates.length,
    currentStreak,
    lastCheckInDate,
  };
}
