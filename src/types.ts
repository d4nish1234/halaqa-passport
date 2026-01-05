export type AgeBand = '7-9' | '10-12' | '13-15' | null;

export type ParticipantProfile = {
  participantId: string;
  nickname: string;
  ageBand: AgeBand;
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
