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
exports.checkInSession = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
admin.initializeApp();
const db = admin.firestore();
exports.checkInSession = functions.https.onCall(async (data) => {
    var _a, _b, _c, _d, _e, _f, _g;
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
