import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

import { FooterNav } from '../components/FooterNav';
import { clearProfile } from '../lib/storage';
import { useProfile } from '../context/ProfileContext';

export function SettingsScreen() {
  const { setProfile } = useProfile();
  const [isDeleting, setIsDeleting] = useState(false);
  const privacyPolicyUrl =
    'https://raw.githubusercontent.com/d4nish1234/halaqa-passport/refs/heads/main/PRIVACY_POLICY.md';

  const handleDeleteData = () => {
    if (isDeleting) {
      return;
    }

    Alert.alert(
      'Delete local data?',
      'This removes your profile from this device so you can sign up again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await clearProfile();
              setProfile(null);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Pressable
            style={({ pressed }) => [styles.rowButton, pressed && styles.rowPressed]}
            onPress={() => Linking.openURL(privacyPolicyUrl)}
            disabled={isDeleting}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>i</Text>
            </View>
            <Text style={styles.rowLabel}>Privacy policy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.rowButton,
              styles.deleteRow,
              pressed && styles.rowPressed,
            ]}
            onPress={handleDeleteData}
            disabled={isDeleting}
          >
            <View style={[styles.iconCircle, styles.deleteIconCircle]}>
              <MaterialIcons name="delete" size={18} color="#B42318" />
            </View>
            <Text style={[styles.rowLabel, styles.deleteLabel]}>
              {isDeleting ? 'Deleting...' : 'Delete data'}
            </Text>
          </Pressable>
        </View>
        <FooterNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  page: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  subtitle: {
    color: '#3F5D52',
  },
  rowButton: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowLabel: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 15,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#1E6F5C',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteRow: {
    borderColor: '#F4D6D4',
  },
  deleteIconCircle: {
    backgroundColor: '#FCE8E6',
  },
  deleteLabel: {
    color: '#B42318',
  },
});
