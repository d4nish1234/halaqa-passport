import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import {
  AttendanceRecord,
  CheckInResult,
  ParticipantProfile,
  Series,
  Session,
  SessionPayload,
} from '../types';
import { db, functions } from './firebase';

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function createParticipantProfile(
  profile: ParticipantProfile
): Promise<void> {
  const ref = doc(db, 'participants', profile.participantId);
  await setDoc(
    ref,
    {
      participantId: profile.participantId,
      nickname: profile.nickname,
      ageBand: profile.ageBand,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateParticipantLastSeen(participantId: string): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  await setDoc(ref, { lastSeenAt: serverTimestamp() }, { merge: true });
}

export async function fetchParticipantAttendanceDates(
  participantId: string
): Promise<Date[]> {
  const attendanceRef = collection(db, 'attendance');
  const attendanceQuery = query(
    attendanceRef,
    where('participantId', '==', participantId)
  );
  const snapshot = await getDocs(attendanceQuery);

  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .map((data) => {
      return toDate(data.timestamp);
    })
    .filter((date): date is Date => Boolean(date));
}

export async function fetchParticipantAttendanceRecords(
  participantId: string
): Promise<AttendanceRecord[]> {
  const attendanceRef = collection(db, 'attendance');
  const attendanceQuery = query(
    attendanceRef,
    where('participantId', '==', participantId)
  );
  const snapshot = await getDocs(attendanceQuery);

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        sessionId: data.sessionId,
        seriesId: data.seriesId,
        participantId: data.participantId,
        timestamp: toDate(data.timestamp),
      };
    })
    .filter((record) => Boolean(record.sessionId && record.seriesId));
}

export async function fetchActiveSeries(): Promise<Series | null> {
  const seriesRef = collection(db, 'series');
  const seriesQuery = query(seriesRef, where('isActive', '==', true), limit(1));
  const snapshot = await getDocs(seriesQuery);
  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name ?? null,
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    isActive: Boolean(data.isActive),
    completed: Boolean(data.completed),
  };
}

export async function fetchSeriesByIds(seriesIds: string[]): Promise<Series[]> {
  const uniqueIds = Array.from(new Set(seriesIds)).filter(Boolean);
  if (uniqueIds.length === 0) {
    return [];
  }

  const seriesRef = collection(db, 'series');
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    batches.push(uniqueIds.slice(i, i + 10));
  }

  const results: Series[] = [];
  for (const batch of batches) {
    const seriesQuery = query(seriesRef, where(documentId(), 'in', batch));
    const snapshot = await getDocs(seriesQuery);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        name: data.name ?? null,
        startDate: toDate(data.startDate),
        endDate: toDate(data.endDate),
        isActive: Boolean(data.isActive),
        completed: Boolean(data.completed),
      });
    });
  }

  return results;
}

export async function fetchSessionsForSeries(seriesId: string): Promise<Session[]> {
  const sessionsRef = collection(db, 'sessions');
  const sessionsQuery = query(sessionsRef, where('seriesId', '==', seriesId));
  const snapshot = await getDocs(sessionsQuery);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      seriesId: data.seriesId ?? seriesId,
      startAt: toDate(data.startAt),
    };
  });
}

export async function fetchParticipantAttendanceForSeries(
  participantId: string,
  seriesId: string
): Promise<AttendanceRecord[]> {
  const attendanceRef = collection(db, 'attendance');
  const attendanceQuery = query(
    attendanceRef,
    where('participantId', '==', participantId)
  );
  const snapshot = await getDocs(attendanceQuery);

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        sessionId: data.sessionId,
        seriesId: data.seriesId ?? seriesId,
        participantId: data.participantId,
        timestamp: toDate(data.timestamp),
      };
    })
    .filter((record) => record.seriesId === seriesId && Boolean(record.sessionId));
}

export async function checkInSession(
  payload: SessionPayload & { participantId: string }
): Promise<CheckInResult> {
  const callable = httpsCallable(functions, 'checkInSession');
  const response = await callable(payload);
  return response.data as CheckInResult;
}

// TODO(admin): list attendance per series -> query attendance where seriesId == ? orderBy timestamp.
// TODO(admin): top attendees -> aggregate attendance count per participantId within seriesId.
// TODO(admin): perfect attendance -> compare attendance count to total sessions in series.
