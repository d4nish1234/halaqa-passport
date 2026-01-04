import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';

import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';
import { createKidProfile } from '../lib/firestore';
import { saveProfile } from '../lib/storage';
import { AgeBand, KidProfile } from '../types';

const AGE_BANDS: { label: string; value: AgeBand }[] = [
  { label: '7-9', value: '7-9' },
  { label: '10-12', value: '10-12' },
  { label: '13-15', value: '13-15' },
];

export function OnboardingScreen() {
  const { setProfile } = useProfile();
  const [nickname, setNickname] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('Please enter a nickname to get started.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const profile: KidProfile = {
        kidId: Crypto.randomUUID(),
        nickname: trimmed,
        ageBand,
      };
      await saveProfile(profile);
      await createKidProfile(profile);
      setProfile(profile);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Halaqa Passport</Text>
          <Text style={styles.subtitle}>Pick a nickname so we can cheer you on.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Brave Explorer"
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Age Band (optional)</Text>
          <View style={styles.ageRow}>
            {AGE_BANDS.map((band) => (
              <Text
                key={band.value}
                style={
                  ageBand === band.value
                    ? [styles.ageChip, styles.ageChipSelected]
                    : styles.ageChip
                }
                onPress={() => setAgeBand(band.value)}
              >
                {band.label}
              </Text>
            ))}
            <Text
              style={ageBand === null ? [styles.ageChip, styles.ageChipSelected] : styles.ageChip}
              onPress={() => setAgeBand(null)}
            >
              Skip
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title={isSubmitting ? 'Saving...' : 'Let’s Go'}
          onPress={handleContinue}
          disabled={isSubmitting}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  subtitle: {
    fontSize: 16,
    color: '#3F5D52',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#2E4B40',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C6D3C5',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  ageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E7EFE8',
    color: '#2E4B40',
    fontWeight: '600',
    overflow: 'hidden',
  },
  ageChipSelected: {
    backgroundColor: '#1E6F5C',
    color: '#fff',
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
});
