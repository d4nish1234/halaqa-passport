# Halaqa Passport (V1)

Kid-friendly QR check-ins for weekly halaqa attendance.

## Local setup

1) Install dependencies:

```bash
npm install
```

2) Create `.env` from `.env.example` and add your Firebase web config:

```bash
cp .env.example .env
```

3) Start Expo:

```bash
npm run start
```

## Firebase config (Expo)

This app reads Firebase config from `EXPO_PUBLIC_FIREBASE_*` env vars.

1) Create the Firebase project + Web app

- Go to Firebase Console → Add project
- In your project → Project settings → General
- Under Your apps → click Web app ( </> )
- Register app (name like `halaqa-passport-expo`)
- You’ll see a config object like:

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

2) Put that config into Expo env vars

In your Expo repo root, create `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
```

To set the API key in Expo (EAS) environment variables:

```bash
eas env:create EXPO_PUBLIC_FIREBASE_API_KEY
```

## Firestore data model

Collections (V1):

- `series`: `{ id, name, startDate, endDate, isActive }`
- `sessions`: `{ id, seriesId, startAt, checkinOpenAt, checkinCloseAt, rotatingToken }`
- `participants`: `{ participantId, nickname, ageBand, createdAt, lastSeenAt }`
- `attendance`: `{ participantId, sessionId, seriesId, timestamp }`

### Test data example

Create a series doc:

```
series/demo-series
{
  "name": "Spring Halaqa",
  "startDate": <timestamp>,
  "endDate": <timestamp>,
  "isActive": true
}
```

Create a session doc:

```
sessions/2025-02-07
{
  "seriesId": "demo-series",
  "startAt": <timestamp>,
  "checkinOpenAt": <timestamp>,
  "checkinCloseAt": <timestamp>,
  "rotatingToken": "friday-qr-2025-02-07"
}
```

QR payload can be either:

- JSON: `{"seriesId":"demo-series","sessionId":"2025-02-07","token":"friday-qr-2025-02-07"}`
- Pipe format: `demo-series|2025-02-07|friday-qr-2025-02-07`

## Backend validation (Cloud Functions)

A callable function is included at `functions/src/index.ts` to enforce:

- session exists
- current time is within `checkinOpenAt` and `checkinCloseAt`
- rotating token matches
- no duplicate attendance per session

To deploy:

```bash
cd functions
npm install
npm run build
npm run deploy
```

## Firestore rules

To deploy:

```bash
firebase deploy --only firestore:rules --project halaqa-passport
```

## Firestore indexes

Composite indexes are required for efficient queries. To deploy:

```bash
firebase deploy --only firestore:indexes --project halaqa-passport
```

## Build iOS (EAS)

```bash
eas build -p ios --profile production
```

## Build Android (EAS)

```bash
eas build -p android --profile production
```

## Notes

- No email/password auth. A local `participantId` UUID is generated and stored locally + in Firestore.
- Time window + duplicate prevention are enforced in the Cloud Function.
- Stats (total + streak) are calculated client-side from attendance docs.
