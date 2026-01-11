import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { FooterNav } from '../components/FooterNav';
import { clearProfile } from '../lib/storage';
import { useProfile } from '../context/ProfileContext';
import {
  disableNotifications,
  enableNotifications,
  fetchParticipantNotificationStatus,
} from '../lib/firestore';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export function SettingsScreen() {
  const { profile, setProfile } = useProfile();
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const privacyPolicyUrl =
    'https://raw.githubusercontent.com/d4nish1234/halaqa-passport/refs/heads/main/PRIVACY_POLICY.md';

  useFocusEffect(
    useCallback(() => {
      if (!profile) {
        return;
      }

      setIsLoadingNotifications(true);
      fetchParticipantNotificationStatus(profile.participantId)
        .then((status) => {
          setNotificationsEnabled(status.notificationsEnabled);
        })
        .catch(() => {
          setNotificationsEnabled(false);
        })
        .finally(() => {
          setIsLoadingNotifications(false);
        });
    }, [profile])
  );

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

  const handleNotificationsToggle = async (nextValue: boolean) => {
    if (!profile || isUpdatingNotifications) {
      return;
    }

    setIsUpdatingNotifications(true);

    try {
      if (nextValue) {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          Alert.alert(
            'Notifications disabled',
            'You can enable reminders later in Settings.'
          );
          setNotificationsEnabled(false);
          return;
        }

        await enableNotifications(profile.participantId, token);
        setNotificationsEnabled(true);
      } else {
        await disableNotifications(profile.participantId);
        setNotificationsEnabled(false);
      }
    } catch (err) {
      Alert.alert('Could not update reminders', 'Please try again.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.rowButton}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="notifications" size={18} color="#1E6F5C" />
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabel}>Reminders</Text>
              <Text style={styles.rowSubLabel}>Get notified before sessions.</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={isLoadingNotifications || isUpdatingNotifications}
              trackColor={{ true: '#1E6F5C' }}
            />
          </View>
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
    paddingTop: 20,
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
  rowSubLabel: {
    color: '#3F5D52',
    fontSize: 12,
  },
  rowTextBlock: {
    flex: 1,
    gap: 2,
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
