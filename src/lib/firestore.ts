import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { CheckInResult, KidProfile, SessionPayload } from '../types';
import { db, functions } from './firebase';

export async function createKidProfile(profile: KidProfile): Promise<void> {
  const ref = doc(db, 'kids', profile.kidId);
  await setDoc(
    ref,
    {
      kidId: profile.kidId,
      nickname: profile.nickname,
      ageBand: profile.ageBand,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateLastSeen(kidId: string): Promise<void> {
  const ref = doc(db, 'kids', kidId);
  await setDoc(ref, { lastSeenAt: serverTimestamp() }, { merge: true });
}

export async function fetchAttendanceDates(kidId: string): Promise<Date[]> {
  const attendanceRef = collection(db, 'attendance');
  const attendanceQuery = query(attendanceRef, where('kidId', '==', kidId));
  const snapshot = await getDocs(attendanceQuery);

  return snapshot.docs
    .map((docSnap) => docSnap.data())
    .map((data) => {
      const timestamp = data.timestamp;
      if (timestamp?.toDate) {
        return timestamp.toDate() as Date;
      }
      return null;
    })
    .filter((date): date is Date => Boolean(date));
}

export async function checkInSession(
  payload: SessionPayload & { kidId: string }
): Promise<CheckInResult> {
  const callable = httpsCallable(functions, 'checkInSession');
  const response = await callable(payload);
  return response.data as CheckInResult;
}

// TODO(admin): list attendance per series -> query attendance where seriesId == ? orderBy timestamp.
// TODO(admin): top attendees -> aggregate attendance count per kidId within seriesId.
// TODO(admin): perfect attendance -> compare attendance count to total sessions in series.
