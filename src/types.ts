export type AgeBand = '5-7' | '8-10' | '11-13' | '14-17' | '18-35' | '36+' | null;

export type ParticipantProfile = {
  participantId: string;
  nickname: string;
  ageBand: AgeBand;
  timeZone?: string | null;
};

export type ParticipantStats = {
  totalCheckIns: number;
  currentStreak: number;
  highestStreak: number;
  seriesParticipated: number;
  lastCheckInDate: string | null;
};

export type Series = {
  id: string;
  name?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  completed?: boolean;
};

export type Session = {
  id: string;
  seriesId: string;
  startAt?: Date | null;
};

export type AttendanceRecord = {
  sessionId: string;
  seriesId: string;
  participantId?: string;
  timestamp?: Date | null;
};

export type SeriesSummary = {
  id: string;
  name: string;
  sessionsAttended: number;
  lastAttendedAt: number | null;
  isActive: boolean;
  isCompleted: boolean;
};

export type SessionPayload = {
  seriesId: string;
  sessionId: string;
  token: string;
};

export type CheckInResult = {
  ok: boolean;
  message: string;
};
