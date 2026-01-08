import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Expo } from 'expo-server-sdk';
import { createHash } from 'crypto';

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
      now.toMillis()
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
    const sentForSeries = new Set<string>();
    const seriesNameCache = new Map<string, string>();
    const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
    const sessions = sessionsSnap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .sort((a, b) => {
        const aStart = a.data.startAt?.toMillis?.() ?? 0;
        const bStart = b.data.startAt?.toMillis?.() ?? 0;
        return aStart - bStart;
      });

    for (const sessionEntry of sessions) {
      const session = sessionEntry.data;
      const sessionId = sessionEntry.id;
      const seriesId = session.seriesId as string | undefined;
      if (!seriesId) {
        continue;
      }

      let seriesName = seriesNameCache.get(seriesId);
      if (!seriesName) {
        const seriesSnap = await db.collection('series').doc(seriesId).get();
        const seriesData = seriesSnap.data();
        seriesName = (seriesData?.name as string | undefined) ?? seriesId;
        seriesNameCache.set(seriesId, seriesName);
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

        const startAt = session.startAt?.toDate?.();
        const timeZone =
          (participant.timeZone as string | undefined) || 'UTC';
        let formatter = timeFormatterCache.get(timeZone);
        if (!formatter) {
          formatter = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone,
          });
          timeFormatterCache.set(timeZone, formatter);
        }
        const startLabel = startAt ? formatter.format(startAt) : 'soon';

        const tokenSeriesKey = `${seriesId}:${expoPushToken}`;
        if (sentForSeries.has(tokenSeriesKey)) {
          continue;
        }

        const tokenHash = createHash('sha256').update(expoPushToken).digest('hex');
        const logRef = db
          .collection('notificationLogs')
          .doc(`${sessionId}_${seriesId}_${tokenHash}`);
        const existing = await logRef.get();
        if (existing.exists) {
          continue;
        }

        messages.push({
          to: expoPushToken,
          sound: 'default',
          title: `Halaqa reminder: ${seriesName}`,
          body: `Your session starts at ${startLabel}.`,
          data: { sessionId, seriesId },
        });
        logRefs.push(logRef);
        sentForSeries.add(tokenSeriesKey);
      }
    }

    if (messages.length === 0) {
      return;
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket) => {
          if (ticket.status === 'error') {
            console.error('reminders:send:error', ticket);
          }
        });
      } catch (err) {
        console.error('reminders:send:exception', err);
      }
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
