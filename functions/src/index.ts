import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const db = admin.firestore();

export const checkInSession = functions.https.onCall(async (data) => {
  const { kidId, sessionId, seriesId, token } = data || {};

  if (!kidId || !sessionId || !seriesId || !token) {
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

  const attendanceId = `${sessionId}_${kidId}`;
  const attendanceRef = db.collection('attendance').doc(attendanceId);

  try {
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(attendanceRef);
      if (existing.exists) {
        throw new functions.https.HttpsError('already-exists', 'Already checked in.');
      }

      transaction.set(attendanceRef, {
        kidId,
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
