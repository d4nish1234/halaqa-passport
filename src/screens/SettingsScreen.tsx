import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [gateVisible, setGateVisible] = useState(false);
  const [gateAnswer, setGateAnswer] = useState('');
  const [gateNumbers, setGateNumbers] = useState({ first: 12, second: 7 });
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | 'delete-data'>(null);
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

  const openWithParentalGate = (url: string) => {
    const first = Math.floor(Math.random() * 8) + 12;
    const second = Math.floor(Math.random() * 8) + 12;
    setGateNumbers({ first, second });
    setGateAnswer('');
    setPendingUrl(url);
    setGateVisible(true);
  };

  const requireParentalGateForAction = (action: 'delete-data') => {
    const first = Math.floor(Math.random() * 8) + 12;
    const second = Math.floor(Math.random() * 8) + 12;
    setGateNumbers({ first, second });
    setGateAnswer('');
    setPendingUrl(null);
    setPendingAction(action);
    setGateVisible(true);
  };

  const handleGateCancel = () => {
    setGateVisible(false);
    setGateAnswer('');
    setPendingUrl(null);
    setPendingAction(null);
  };

  const handleGateConfirm = async () => {
    const expected = gateNumbers.first + gateNumbers.second;
    const normalized = Number(gateAnswer.trim());

    if (Number.isNaN(normalized) || normalized !== expected) {
      Alert.alert('Try again', 'That answer was not correct.');
      const first = Math.floor(Math.random() * 8) + 12;
      const second = Math.floor(Math.random() * 8) + 12;
      setGateNumbers({ first, second });
      setGateAnswer('');
      return;
    }

    const url = pendingUrl;
    const action = pendingAction;
    setGateVisible(false);
    setGateAnswer('');
    setPendingUrl(null);
    setPendingAction(null);

    if (url) {
      await Linking.openURL(url);
      return;
    }

    if (action === 'delete-data') {
      handleDeleteData();
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
            onPress={() => openWithParentalGate(privacyPolicyUrl)}
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
            onPress={() => requireParentalGateForAction('delete-data')}
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
      <Modal
        transparent
        animationType="fade"
        visible={gateVisible}
        onRequestClose={handleGateCancel}
      >
        <View style={styles.gateBackdrop}>
          <View style={styles.gateCard}>
            <Text style={styles.gateTitle}>Parents only</Text>
            <Text style={styles.gateSubtitle}>
              Solve this to continue: {gateNumbers.first} + {gateNumbers.second}
            </Text>
            <TextInput
              value={gateAnswer}
              onChangeText={setGateAnswer}
              placeholder="Enter answer"
              keyboardType="number-pad"
              style={styles.gateInput}
            />
            <View style={styles.gateActions}>
              <Pressable style={styles.gateCancelButton} onPress={handleGateCancel}>
                <Text style={styles.gateCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.gateConfirmButton} onPress={handleGateConfirm}>
                <Text style={styles.gateConfirmText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  gateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  gateCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  gateSubtitle: {
    fontSize: 14,
    color: '#3F5D52',
  },
  gateInput: {
    borderWidth: 1,
    borderColor: '#D2DDD7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1B3A2E',
  },
  gateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  gateCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  gateCancelText: {
    color: '#3F5D52',
    fontWeight: '600',
  },
  gateConfirmButton: {
    backgroundColor: '#1E6F5C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  gateConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
});
