import { KidStats } from '../types';

type Badge = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export function getBadges(stats: KidStats): Badge[] {
  return [
    {
      id: 'first-checkin',
      title: 'First Step',
      description: 'First check-in completed',
      unlocked: stats.totalCheckIns >= 1,
    },
    {
      id: 'five-checkins',
      title: 'High Five',
      description: '5 check-ins total',
      unlocked: stats.totalCheckIns >= 5,
    },
    {
      id: 'three-week-streak',
      title: 'Steady Streak',
      description: '3 weeks in a row',
      unlocked: stats.currentStreak >= 3,
    },
  ];
}
