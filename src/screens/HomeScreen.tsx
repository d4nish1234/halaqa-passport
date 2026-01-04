import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';
import { getBadges } from '../lib/badges';
import { fetchAttendanceDates, updateLastSeen } from '../lib/firestore';
import { calculateStats } from '../lib/stats';
import { KidStats } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

export function HomeScreen() {
  const { profile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<KidStats>({
    totalCheckIns: 0,
    currentStreak: 0,
    lastCheckInDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const badges = getBadges(stats);
  const kidIdSuffix = profile?.kidId ? profile.kidId.slice(-4) : '';
  const displayName = profile ? `${profile.nickname} (${kidIdSuffix})` : '';

  const loadStats = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateLastSeen(profile.kidId);
      const attendanceDates = await fetchAttendanceDates(profile.kidId);
      setStats(calculateStats(attendanceDates));
    } catch (err) {
      setError('We had trouble loading your stats.');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Salaam, {displayName}!</Text>
          <Text style={styles.subtitle}>Ready for another check-in?</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Check-ins</Text>
            <Text style={styles.statValue}>{stats.totalCheckIns}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>{stats.currentStreak} weeks</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Check-in</Text>
            <Text style={styles.statValue}>{stats.lastCheckInDate ?? 'Not yet'}</Text>
          </View>
        </View>

        <View style={styles.badgeSection}>
          <Text style={styles.badgeTitle}>Badges</Text>
          <View style={styles.badgeGrid}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                ]}
              >
                <Text style={styles.badgeName}>{badge.title}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {isLoading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Scan QR to Check In"
          onPress={() => navigation.navigate('Scan')}
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
    gap: 24,
  },
  header: {
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  subtitle: {
    color: '#3F5D52',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E3EAE4',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#3F5D52',
    fontSize: 14,
  },
  statValue: {
    fontWeight: '700',
    color: '#1B3A2E',
    fontSize: 16,
  },
  badgeSection: {
    gap: 10,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeUnlocked: {
    backgroundColor: '#FFF6DA',
    borderColor: '#F4D98C',
  },
  badgeLocked: {
    backgroundColor: '#EEF1EE',
    borderColor: '#D8E1D8',
  },
  badgeName: {
    fontWeight: '700',
    color: '#1B3A2E',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#3F5D52',
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
});
