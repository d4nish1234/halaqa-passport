import { SessionPayload } from '../types';

export function parseSessionPayload(raw: string): SessionPayload | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<SessionPayload>;
      if (parsed.seriesId && parsed.sessionId && parsed.token) {
        return {
          seriesId: parsed.seriesId,
          sessionId: parsed.sessionId,
          token: parsed.token,
        };
      }
    } catch {
      return null;
    }
  }

  const parts = trimmed.split('|');
  if (parts.length >= 3) {
    const [seriesId, sessionId, token] = parts;
    if (seriesId && sessionId && token) {
      return { seriesId, sessionId, token };
    }
  }

  return null;
}
