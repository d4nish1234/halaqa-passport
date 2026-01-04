import AsyncStorage from '@react-native-async-storage/async-storage';

import { KidProfile } from '../types';

const PROFILE_KEY = 'halaqa:kidProfile';

export async function loadProfile(): Promise<KidProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as KidProfile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: KidProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
