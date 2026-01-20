import { ParticipantStats } from '../types';

type Badge = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export function getBadges(stats: ParticipantStats): Badge[] {
  return [
    {
      id: 'first-checkin',
      title: 'First Step',
      description: 'First check-in completed',
      unlocked: stats.totalCheckIns >= 1,
    },
    {
      id: 'series-starter',
      title: 'Series Starter',
      description: 'Joined a halaqa series',
      unlocked: stats.seriesParticipated >= 1,
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
      description: '3 sessions in a row',
      unlocked: stats.currentStreak >= 3,
    },
    {
      id: 'five-session-streak',
      title: 'Momentum Maker',
      description: '5 sessions in a row',
      unlocked: stats.currentStreak >= 5,
    },
    {
      id: 'three-series',
      title: 'Series Explorer',
      description: 'Participated in 3 series',
      unlocked: stats.seriesParticipated >= 3,
    },
  ];
}
