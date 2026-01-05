import AsyncStorage from '@react-native-async-storage/async-storage';

import { KidProfile } from '../types';

const PROFILE_KEY = 'halaqa:participantProfile';
const LEGACY_PROFILE_KEY = 'halaqa:kidProfile';

export async function loadProfile(): Promise<KidProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  const legacyRaw = raw ? null : await AsyncStorage.getItem(LEGACY_PROFILE_KEY);
  const payload = raw ?? legacyRaw;
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as KidProfile & { kidId?: string };
    if (!parsed.participantId && parsed.kidId) {
      const migrated: KidProfile = {
        participantId: parsed.kidId,
        nickname: parsed.nickname,
        ageBand: parsed.ageBand,
      };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
      await AsyncStorage.removeItem(LEGACY_PROFILE_KEY);
      return migrated;
    }
    return parsed as KidProfile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: KidProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
