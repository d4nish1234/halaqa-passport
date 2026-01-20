import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { useProfile } from '../context/ProfileContext';
import { getBadges } from '../lib/badges';
import {
  fetchActiveSeries,
  fetchParticipantAttendanceDates,
  fetchParticipantAttendanceForSeries,
  fetchParticipantAttendanceRecords,
  fetchSessionsForSeries,
} from '../lib/firestore';
import { calculateSeriesStreak, calculateTotals } from '../lib/stats';
import { RootStackParamList } from '../navigation/RootNavigator';
import type { ParticipantStats } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Badges'>;

export function BadgesScreen({ route }: Props) {
  const { profile } = useProfile();
  const providedStats = route.params?.stats;
  const [stats, setStats] = useState<ParticipantStats>(
    providedStats ?? {
      totalCheckIns: 0,
      currentStreak: 0,
      highestStreak: 0,
      seriesParticipated: 0,
      lastCheckInDate: null,
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providedStats) {
      setStats(providedStats);
    }
  }, [providedStats]);

  const loadStats = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [attendanceDates, attendanceRecords, activeSeries] = await Promise.all([
        fetchParticipantAttendanceDates(profile.participantId),
        fetchParticipantAttendanceRecords(profile.participantId),
        fetchActiveSeries(),
      ]);

      let currentStreak = 0;
      let highestStreak = 0;

      if (activeSeries) {
        const [sessions, attendance] = await Promise.all([
          fetchSessionsForSeries(activeSeries.id),
          fetchParticipantAttendanceForSeries(profile.participantId, activeSeries.id),
        ]);
        const streaks = calculateSeriesStreak(sessions, attendance);
        currentStreak = streaks.currentStreak;
        highestStreak = streaks.highestStreak;
      }

      const totals = calculateTotals(attendanceDates);
      const seriesIds = new Set<string>();
      attendanceRecords.forEach((record) => {
        if (record.seriesId) {
          seriesIds.add(record.seriesId);
        }
      });

      setStats({
        totalCheckIns: totals.totalCheckIns,
        lastCheckInDate: totals.lastCheckInDate,
        currentStreak,
        highestStreak,
        seriesParticipated: seriesIds.size,
      });
    } catch (err) {
      setError('We had trouble loading your badges.');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!providedStats) {
      loadStats();
    }
  }, [loadStats, providedStats]);

  const statsFallback = {
    totalCheckIns: 0,
    currentStreak: 0,
    highestStreak: 0,
    seriesParticipated: 0,
    lastCheckInDate: null,
  };
  const badges = getBadges(stats ?? statsFallback);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Badges</Text>
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>My Stats</Text>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Check-ins</Text>
                <Text style={styles.statValue}>{stats.totalCheckIns}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Current Series Streak</Text>
                <Text style={styles.statValue}>{stats.currentStreak} sessions</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Highest Series Streak</Text>
                <Text style={styles.statValue}>{stats.highestStreak} sessions</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last Check-in</Text>
                <Text style={styles.statValue}>{stats.lastCheckInDate ?? 'Not yet'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.list}>
            {isLoading ? <ActivityIndicator /> : null}
            {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                ]}
              >
                <View style={styles.badgeHeader}>
                  <Text style={styles.badgeName}>{badge.title}</Text>
                  <Text style={styles.badgeStatus}>
                    {badge.unlocked ? 'Earned' : 'Locked'}
                  </Text>
                </View>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <FooterNav stats={stats} />
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
  container: {
    padding: 24,
    gap: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  list: {
    gap: 12,
  },
  statsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
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
  badgeCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
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
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeName: {
    fontWeight: '700',
    color: '#1B3A2E',
    fontSize: 16,
  },
  badgeStatus: {
    fontWeight: '600',
    color: '#3F5D52',
    fontSize: 12,
  },
  badgeDescription: {
    marginTop: 6,
    fontSize: 13,
    color: '#3F5D52',
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
});
