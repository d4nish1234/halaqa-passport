import AsyncStorage from '@react-native-async-storage/async-storage';

import { ParticipantProfile } from '../types';

const PROFILE_KEY = 'halaqa:participantProfile';

export async function loadProfile(): Promise<ParticipantProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ParticipantProfile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: ParticipantProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
