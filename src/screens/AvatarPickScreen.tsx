import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';
import { avatars } from '../lib/avatars';
import { updateParticipantAvatar } from '../lib/firestore';
import { saveProfile } from '../lib/storage';
import type { RootStackParamList } from '../navigation/RootNavigator';

const ROW_COUNT = 2;

export function AvatarPickScreen() {
  const { profile, setProfile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewFormIndex, setPreviewFormIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const avatarFormLevels = profile?.avatarFormLevels ?? [];

  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedAvatarId) ?? null;
  const previewImage = selectedAvatar
    ? selectedAvatar.forms[
        Math.min(previewFormIndex, selectedAvatar.forms.length - 1)
      ]
    : null;
  const selectedStoredForm =
    selectedAvatarId && selectedAvatar
      ? avatarFormLevels.find((entry) => entry.avatarId === selectedAvatarId)
          ?.formLevel ?? 1
      : 1;
  const selectedFormsCount = selectedAvatar?.forms.length ?? 0;
  const isSelectedAvatarMaxed =
    Boolean(selectedAvatar) && selectedStoredForm >= selectedFormsCount;

  const columns = useMemo(() => {
    const totalSlots = Math.max(avatars.length, ROW_COUNT);
    const filledSlots = Math.ceil(totalSlots / ROW_COUNT) * ROW_COUNT;
    const slots = Array.from({ length: filledSlots }, (_, index) => index);
    const chunks: number[][] = [];
    for (let i = 0; i < slots.length; i += ROW_COUNT) {
      chunks.push(slots.slice(i, i + ROW_COUNT));
    }
    return chunks;
  }, []);

  if (!profile || avatars.length === 0) {
    return null;
  }

  const navigateHomeIfAvailable = () => {
    const state = navigation.getState();
    if (state.routeNames?.includes('Home')) {
      navigation.navigate('Home', {});
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (profile.avatarId && !navigation.canGoBack()) {
      if (!navigateHomeIfAvailable()) {
        setTimeout(() => {
          navigateHomeIfAvailable();
        }, 0);
      }
    }
  }, [navigation, profile.avatarId]);

  const handleConfirm = async () => {
    if (!selectedAvatarId || isSaving) {
      return;
    }

    const storedFormLevel =
      avatarFormLevels.find((entry) => entry.avatarId === selectedAvatarId)?.formLevel ?? 1;
    const nextFormLevels = avatarFormLevels.some(
      (entry) => entry.avatarId === selectedAvatarId
    )
      ? avatarFormLevels
      : [...avatarFormLevels, { avatarId: selectedAvatarId, formLevel: 1 }];
    setIsSaving(true);
    const nextProfile = {
      ...profile,
      avatarId: selectedAvatarId,
      avatarFormLevels: nextFormLevels,
    };

    try {
      await saveProfile(nextProfile);
      await updateParticipantAvatar(profile.participantId, selectedAvatarId, nextFormLevels);
      setProfile(nextProfile);
      setPreviewFormIndex(Math.max(0, storedFormLevel - 1));
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigateHomeIfAvailable();
      }
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
            {columns.map((column, columnIndex) => (
              <View key={`column-${columnIndex}`} style={styles.column}>
                {column.map((slotIndex, index) => {
                const avatarOption = avatars[slotIndex] ?? null;
                const isSelected = selectedIndex === slotIndex;
                return (
                  <Pressable
                    key={`avatar-${columnIndex}-${index}`}
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
                      const storedFormLevel =
                        avatarFormLevels.find(
                          (entry) => entry.avatarId === avatarOption.id
                        )?.formLevel ?? 1;
                      setSelectedAvatarId(avatarOption.id);
                      setSelectedIndex(slotIndex);
                      setPreviewFormIndex(Math.max(0, storedFormLevel - 1));
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
          {isSelectedAvatarMaxed ? (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>✓</Text>
            </View>
          ) : null}
          {previewImage ? (
            <Image source={previewImage} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewPlaceholder}>Select an avatar to preview.</Text>
          )}
        </View>
        {selectedAvatar ? (
          <Text style={styles.previewFormText}>
            Form {selectedStoredForm} of {selectedFormsCount}
          </Text>
        ) : null}
        {selectedAvatar ? (
          <View style={styles.formControls}>
            <Pressable
              style={({ pressed }) => [
                styles.formButton,
                pressed && styles.formButtonPressed,
              ]}
              onPress={() =>
                setPreviewFormIndex((prev) =>
                  prev <= 0 ? selectedAvatar.forms.length - 1 : prev - 1
                )
              }
            >
              <Text style={styles.formButtonText}>Prev form</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.formButton,
                pressed && styles.formButtonPressed,
              ]}
              onPress={() =>
                setPreviewFormIndex((prev) =>
                  prev >= selectedAvatar.forms.length - 1 ? 0 : prev + 1
                )
              }
            >
              <Text style={styles.formButtonText}>Next form</Text>
            </Pressable>
          </View>
        ) : null}

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
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flexDirection: 'column',
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
  previewFormText: {
    textAlign: 'center',
    color: '#3F5D52',
    fontSize: 12,
    fontWeight: '600',
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E6F5C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  formControls: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  formButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#E7EFE8',
  },
  formButtonPressed: {
    opacity: 0.8,
  },
  formButtonText: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 12,
  },
});
