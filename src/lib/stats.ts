import { AttendanceRecord, KidStats, Session } from '../types';

export function calculateTotals(
  attendanceDates: Date[]
): Pick<KidStats, 'totalCheckIns' | 'lastCheckInDate'> {
  if (attendanceDates.length === 0) {
    return {
      totalCheckIns: 0,
      lastCheckInDate: null,
    };
  }

  const sorted = [...attendanceDates].sort((a, b) => b.getTime() - a.getTime());
  const lastCheckInDate = sorted[0].toLocaleDateString();

  return {
    totalCheckIns: attendanceDates.length,
    lastCheckInDate,
  };
}

export function calculateSeriesStreak(
  sessions: Session[],
  attendance: AttendanceRecord[]
): Pick<KidStats, 'currentStreak' | 'highestStreak'> {
  if (sessions.length === 0) {
    return { currentStreak: 0, highestStreak: 0 };
  }

  const attendedSessionIds = new Set(
    attendance.map((record) => record.sessionId).filter(Boolean)
  );
  const now = new Date();
  const completedSessions = sessions.filter(
    (session) => !session.startAt || session.startAt <= now
  );

  completedSessions.sort((a, b) => {
    const aTime = a.startAt?.getTime() ?? 0;
    const bTime = b.startAt?.getTime() ?? 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });

  let currentStreak = 0;
  let highestStreak = 0;

  for (const session of completedSessions) {
    if (attendedSessionIds.has(session.id)) {
      currentStreak += 1;
      highestStreak = Math.max(highestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { currentStreak, highestStreak };
}
