export type AgeBand = '7-9' | '10-12' | '13-15' | null;

export type KidProfile = {
  kidId: string;
  nickname: string;
  ageBand: AgeBand;
};

export type KidStats = {
  totalCheckIns: number;
  currentStreak: number;
  lastCheckInDate: string | null;
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
