import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Expo } from 'expo-server-sdk';

admin.initializeApp();

const db = admin.firestore();
const expo = new Expo();

export const checkInSession = functions.https.onCall(async (request) => {
  const { participantId, sessionId, seriesId, token } = request.data || {};

  if (!participantId || !sessionId || !seriesId || !token) {
    return { ok: false, message: 'Missing check-in details.' };
  }

  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return { ok: false, message: 'Session not found.' };
  }

  const session = sessionSnap.data();
  if (!session || session.seriesId !== seriesId) {
    return { ok: false, message: 'Session mismatch.' };
  }

  const now = admin.firestore.Timestamp.now();
  const openAt = session.checkinOpenAt?.toMillis?.() ?? 0;
  const closeAt = session.checkinCloseAt?.toMillis?.() ?? 0;
  const nowMs = now.toMillis();

  if (!openAt || !closeAt) {
    return { ok: false, message: 'Check-in window is not set.' };
  }

  if (nowMs < openAt) {
    return { ok: false, message: 'Check-in is not open yet.' };
  }

  if (nowMs > closeAt) {
    return { ok: false, message: 'Check-in is closed.' };
  }

  const validToken = session.rotatingToken ?? session.token;
  if (!validToken || validToken !== token) {
    return { ok: false, message: 'This QR code has expired.' };
  }

  const attendanceId = `${sessionId}_${participantId}`;
  const attendanceRef = db.collection('attendance').doc(attendanceId);

  try {
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(attendanceRef);
      if (existing.exists) {
        throw new functions.https.HttpsError('already-exists', 'Already checked in.');
      }

      transaction.set(attendanceRef, {
        participantId,
        sessionId,
        seriesId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const errorCode =
      error instanceof functions.https.HttpsError ? error.code : (error as { code?: string })?.code;
    if (errorCode === 'already-exists') {
      return { ok: false, message: 'Already checked in.' };
    }

    console.error('checkInSession failed', error);
    return { ok: false, message: 'Check-in failed. Please try again.' };
  }

  return { ok: true, message: 'Checked in!' };
});

export const sendSessionReminders = onSchedule(
  { schedule: 'every 2 hours', timeZone: 'UTC' },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 4 * 60 * 60 * 1000
    );
    const windowEnd = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 5 * 60 * 60 * 1000
    );

    const sessionsSnap = await db
      .collection('sessions')
      .where('startAt', '>=', windowStart)
      .where('startAt', '<', windowEnd)
      .get();

    if (sessionsSnap.empty) {
      return;
    }

    const messages: {
      to: string;
      sound: 'default';
      title: string;
      body: string;
      data: { sessionId: string; seriesId: string };
    }[] = [];
    const logRefs: admin.firestore.DocumentReference[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const session = sessionDoc.data();
      const seriesId = session.seriesId as string | undefined;
      if (!seriesId) {
        continue;
      }

      const participantsSnap = await db
        .collection('participants')
        .where('notificationsEnabled', '==', true)
        .where('subscribedSeriesIds', 'array-contains', seriesId)
        .get();

      for (const participantDoc of participantsSnap.docs) {
        const participant = participantDoc.data();
        const expoPushToken = participant.expoPushToken as string | undefined;
        if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken)) {
          continue;
        }

        const logRef = db
          .collection('notificationLogs')
          .doc(`${sessionDoc.id}_${participantDoc.id}`);
        const existing = await logRef.get();
        if (existing.exists) {
          continue;
        }

        messages.push({
          to: expoPushToken,
          sound: 'default',
          title: 'Halaqa reminder',
          body: 'Your session starts in a few hours.',
          data: { sessionId: sessionDoc.id, seriesId },
        });
        logRefs.push(logRef);
      }
    }

    if (messages.length === 0) {
      return;
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    const batch = db.batch();
    logRefs.forEach((ref) => {
      batch.set(ref, {
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    return;
  }
);
