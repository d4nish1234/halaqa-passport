"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSessionReminders = exports.checkInSession = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const expo_server_sdk_1 = require("expo-server-sdk");
admin.initializeApp();
const db = admin.firestore();
const expo = new expo_server_sdk_1.Expo();
exports.checkInSession = functions.https.onCall(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
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
    const openAt = (_c = (_b = (_a = session.checkinOpenAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0;
    const closeAt = (_f = (_e = (_d = session.checkinCloseAt) === null || _d === void 0 ? void 0 : _d.toMillis) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : 0;
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
    const validToken = (_g = session.rotatingToken) !== null && _g !== void 0 ? _g : session.token;
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
    }
    catch (error) {
        const errorCode = error instanceof functions.https.HttpsError ? error.code : error === null || error === void 0 ? void 0 : error.code;
        if (errorCode === 'already-exists') {
            return { ok: false, message: 'Already checked in.' };
        }
        console.error('checkInSession failed', error);
        return { ok: false, message: 'Check-in failed. Please try again.' };
    }
    return { ok: true, message: 'Checked in!' };
});
exports.sendSessionReminders = (0, scheduler_1.onSchedule)({ schedule: 'every 2 hours', timeZone: 'UTC' }, async () => {
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(now.toMillis() + 4 * 60 * 60 * 1000);
    const windowEnd = admin.firestore.Timestamp.fromMillis(now.toMillis() + 5 * 60 * 60 * 1000);
    const sessionsSnap = await db
        .collection('sessions')
        .where('startAt', '>=', windowStart)
        .where('startAt', '<', windowEnd)
        .get();
    if (sessionsSnap.empty) {
        return;
    }
    const messages = [];
    const logRefs = [];
    for (const sessionDoc of sessionsSnap.docs) {
        const session = sessionDoc.data();
        const seriesId = session.seriesId;
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
            const expoPushToken = participant.expoPushToken;
            if (!expoPushToken || !expo_server_sdk_1.Expo.isExpoPushToken(expoPushToken)) {
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
});
