import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';
import { avatars } from '../lib/avatars';
import { updateParticipantAvatar } from '../lib/firestore';
import { saveProfile } from '../lib/storage';

const ROW_SIZE = 3;
const PLACEHOLDER_COUNT = 6;

export function AvatarPickScreen() {
  const { profile, setProfile } = useProfile();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedAvatarId) ?? null;
  const previewImage = selectedAvatar?.forms[selectedAvatar.forms.length - 1] ?? null;

  const rows = useMemo(() => {
    const slots = Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => index);
    const chunks: number[][] = [];
    for (let i = 0; i < slots.length; i += ROW_SIZE) {
      chunks.push(slots.slice(i, i + ROW_SIZE));
    }
    return chunks;
  }, []);

  if (!profile || avatars.length === 0) {
    return null;
  }

  const handleConfirm = async () => {
    if (!selectedAvatarId || isSaving) {
      return;
    }

    setIsSaving(true);
    const nextProfile = {
      ...profile,
      avatarId: selectedAvatarId,
      avatarFormLevel: 1,
    };

    try {
      await saveProfile(nextProfile);
      await updateParticipantAvatar(profile.participantId, selectedAvatarId, 1);
      setProfile(nextProfile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Pick your avatar</Text>
        <Text style={styles.subtitle}>
          Your avatar starts small and grows as you check in.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rows}
        >
          <View style={styles.rowGroup}>
            {rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.row}>
                {row.map((slotIndex, index) => {
                const avatarOption = avatars[slotIndex] ?? null;
                const isSelected = selectedIndex === slotIndex;
                return (
                  <Pressable
                    key={`avatar-${rowIndex}-${index}`}
                    style={({ pressed }) => [
                      styles.avatarThumb,
                      !avatarOption && styles.avatarThumbPlaceholder,
                      isSelected && styles.avatarThumbSelected,
                      pressed && avatarOption && styles.avatarThumbPressed,
                    ]}
                    onPress={() => {
                      if (!avatarOption) {
                        return;
                      }
                      setSelectedAvatarId(avatarOption.id);
                      setSelectedIndex(slotIndex);
                    }}
                  >
                    {avatarOption ? (
                      <Image
                        source={avatarOption.forms[avatarOption.forms.length - 1]}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarPlaceholderText}>?</Text>
                    )}
                  </Pressable>
                );
              })}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.preview}>
          {previewImage ? (
            <Image source={previewImage} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewPlaceholder}>Select an avatar to preview.</Text>
          )}
        </View>

        <PrimaryButton
          title={isSaving ? 'Saving...' : 'Confirm avatar'}
          onPress={handleConfirm}
          disabled={isSaving || !selectedAvatarId}
        />
      </View>
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
    paddingTop: 10,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  subtitle: {
    color: '#3F5D52',
    fontSize: 14,
  },
  rows: {
    gap: 12,
  },
  rowGroup: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarThumb: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThumbSelected: {
    borderColor: '#1E6F5C',
    borderWidth: 2,
  },
  avatarThumbPressed: {
    opacity: 0.8,
  },
  avatarThumbPlaceholder: {
    backgroundColor: '#F4F1EA',
  },
  avatarPlaceholderText: {
    color: '#C0B6A6',
    fontWeight: '700',
    fontSize: 18,
  },
  avatarImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  preview: {
    height: 220,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 170,
    height: 170,
    resizeMode: 'contain',
  },
  previewPlaceholder: {
    color: '#3F5D52',
    fontSize: 14,
  },
});
