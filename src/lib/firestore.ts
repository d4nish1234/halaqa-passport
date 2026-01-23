import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  documentId,
  getDocs,
  getDoc,
  FieldPath,
  arrayUnion,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  const timeZone = profile.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ref = doc(db, 'participants', profile.participantId);
  await setDoc(
    ref,
    {
      participantId: profile.participantId,
      nickname: profile.nickname,
      ageBand: profile.ageBand ?? null,
      ...(profile.avatarId ? { avatarId: profile.avatarId } : {}),
      ...(Array.isArray(profile.avatarFormLevels)
        ? { avatarFormLevels: profile.avatarFormLevels }
        : {}),
      timeZone,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateParticipantLastSeen(participantId: string): Promise<void> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ref = doc(db, 'participants', participantId);
  await setDoc(ref, { lastSeenAt: serverTimestamp(), timeZone }, { merge: true });
}

export async function fetchParticipantNotificationStatus(
  participantId: string
): Promise<{ notificationsEnabled: boolean }> {
  const ref = doc(db, 'participants', participantId);
  const snapshot = await getDoc(ref);
  const data = snapshot.data();
  return {
    notificationsEnabled: Boolean(data?.notificationsEnabled),
  };
}

export async function enableNotifications(
  participantId: string,
  expoPushToken: string
): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  await updateDoc(ref, {
    expoPushToken,
    notificationsEnabled: true,
    lastSeenAt: serverTimestamp(),
  });
}

export async function disableNotifications(participantId: string): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  await updateDoc(ref, {
    expoPushToken: null,
    notificationsEnabled: false,
    lastSeenAt: serverTimestamp(),
  });
}

export async function recordSeriesParticipation(
  participantId: string,
  seriesId: string
): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  await updateDoc(ref, {
    subscribedSeriesIds: arrayUnion(seriesId),
    lastSeenAt: serverTimestamp(),
  });
}

export async function updateParticipantAvatar(
  participantId: string,
  avatarId: string,
  avatarFormLevels: { avatarId: string; formLevel: number }[],
  lastEvolvedExperience?: number | null
): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  await updateDoc(ref, {
    avatarId,
    avatarFormLevels,
    ...(typeof lastEvolvedExperience === 'number'
      ? { lastEvolvedExperience }
      : {}),
    lastSeenAt: serverTimestamp(),
  });
}

export async function fetchParticipantExperience(
  participantId: string
): Promise<number | null> {
  const ref = doc(db, 'participants', participantId);
  const snapshot = await getDoc(ref);
  const data = snapshot.data();
  return typeof data?.experience === 'number' ? data.experience : null;
}

export async function fetchParticipantRewardClaims(
  participantId: string
): Promise<Record<string, number[]>> {
  const ref = doc(db, 'participants', participantId);
  const snapshot = await getDoc(ref);
  const data = snapshot.data();
  const rewards = data?.rewards as Record<string, { claimed?: number[] }> | undefined;
  if (!rewards) {
    return {};
  }

  const claims: Record<string, number[]> = {};
  Object.entries(rewards).forEach(([seriesId, entry]) => {
    claims[seriesId] = Array.isArray(entry?.claimed) ? entry.claimed : [];
  });
  return claims;
}

export async function claimSeriesReward(
  participantId: string,
  seriesId: string,
  rewardThreshold: number
): Promise<void> {
  const ref = doc(db, 'participants', participantId);
  const claimedPath = new FieldPath('rewards', seriesId, 'claimed');
  await updateDoc(
    ref,
    claimedPath,
    arrayUnion(rewardThreshold),
    'lastSeenAt',
    serverTimestamp()
  );
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
    rewards: Array.isArray(data.rewards) ? data.rewards : undefined,
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
        rewards: Array.isArray(data.rewards) ? data.rewards : undefined,
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
