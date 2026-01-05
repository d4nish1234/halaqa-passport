import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { useProfile } from '../context/ProfileContext';
import { getBadges } from '../lib/badges';
import {
  fetchActiveSeries,
  fetchParticipantAttendanceDates,
  fetchParticipantAttendanceRecords,
  fetchParticipantAttendanceForSeries,
  fetchSeriesByIds,
  fetchSessionsForSeries,
  updateParticipantLastSeen,
} from '../lib/firestore';
import { calculateSeriesStreak, calculateTotals } from '../lib/stats';
import { ParticipantStats, SeriesSummary } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

export function HomeScreen() {
  const { profile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<ParticipantStats>({
    totalCheckIns: 0,
    currentStreak: 0,
    highestStreak: 0,
    seriesParticipated: 0,
    lastCheckInDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seriesSummaries, setSeriesSummaries] = useState<SeriesSummary[]>([]);
  const [currentSeries, setCurrentSeries] = useState<SeriesSummary | null>(null);
  const badges = getBadges(stats);
  const earnedBadges = badges.filter((badge) => badge.unlocked);
  const participantIdSuffix = profile?.participantId
    ? profile.participantId.slice(-4)
    : '';
  const displayName = profile ? `${profile.nickname} (${participantIdSuffix})` : '';

  const loadStats = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateParticipantLastSeen(profile.participantId);
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

      const seriesMap = new Map<string, { count: number; lastAttendedAt: number }>();
      attendanceRecords.forEach((record) => {
        if (!record.seriesId) {
          return;
        }
        const entry = seriesMap.get(record.seriesId) ?? {
          count: 0,
          lastAttendedAt: 0,
        };
        entry.count += 1;
        const timestamp = record.timestamp?.getTime() ?? 0;
        if (timestamp > entry.lastAttendedAt) {
          entry.lastAttendedAt = timestamp;
        }
        seriesMap.set(record.seriesId, entry);
      });

      const seriesIds = Array.from(seriesMap.keys());
      const seriesDocs = await fetchSeriesByIds(seriesIds);
      const seriesById = new Map(seriesDocs.map((series) => [series.id, series]));
      const summaries = seriesIds.map((seriesId) => {
        const series = seriesById.get(seriesId);
        const entry = seriesMap.get(seriesId);
        const isCompleted = Boolean(series?.completed);

        return {
          id: seriesId,
          name: series?.name ?? seriesId,
          sessionsAttended: entry?.count ?? 0,
          lastAttendedAt: entry?.lastAttendedAt ?? null,
          isActive: Boolean(series?.isActive),
          isCompleted,
        };
      });

      summaries.sort(
        (a, b) => (b.lastAttendedAt ?? 0) - (a.lastAttendedAt ?? 0)
      );

      setSeriesSummaries(summaries);
      setCurrentSeries(summaries[0] ?? null);

      const seriesParticipated = summaries.length;
      setStats({
        totalCheckIns: totals.totalCheckIns,
        lastCheckInDate: totals.lastCheckInDate,
        currentStreak,
        highestStreak,
        seriesParticipated,
      });
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
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Salaam, {displayName}!</Text>
            <Text style={styles.subtitle}>Ready for another check-in?</Text>
          </View>

          <View style={styles.seriesSection}>
            <View style={styles.seriesHeader}>
              <Text style={styles.seriesTitle}>My Recent Series</Text>
              <Pressable
                onPress={() => navigation.navigate('Series', { series: seriesSummaries })}
              >
                <Text style={styles.seriesLink}>View All</Text>
              </Pressable>
            </View>
            {currentSeries ? (
              <View style={styles.seriesCard}>
                <View style={styles.seriesTopRow}>
                  <Text style={styles.seriesName}>{currentSeries.name}</Text>
                  {currentSeries.isCompleted ? (
                    <View style={styles.seriesPill}>
                      <Text style={styles.seriesPillText}>Completed</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.seriesMeta}>
                  {currentSeries.sessionsAttended} sessions attended
                </Text>
              </View>
            ) : (
              <View style={styles.seriesEmpty}>
                <Text style={styles.seriesEmptyText}>Scan QR code to join a series.</Text>
              </View>
            )}
          </View>

          <View style={styles.badgeSection}>
            <View style={styles.badgeHeader}>
              <Text style={styles.badgeTitle}>My Badges</Text>
              <Pressable onPress={() => navigation.navigate('Badges', { stats })}>
                <Text style={styles.badgeLink}>View All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeRow}
            >
              {earnedBadges.length ? (
                earnedBadges.map((badge) => (
                  <View key={badge.id} style={[styles.badgeCard, styles.badgeUnlocked]}>
                    <Text style={styles.badgeName}>{badge.title}</Text>
                    <Text style={styles.badgeDescription}>{badge.description}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.badgeCard, styles.badgeEmpty]}>
                  <Text style={styles.badgeEmptyTitle}>No badges yet</Text>
                  <Text style={styles.badgeDescription}>Check in to start earning.</Text>
                </View>
              )}
            </ScrollView>
          </View>

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

          {isLoading ? <ActivityIndicator /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <FooterNav stats={stats} series={seriesSummaries} />
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
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 24,
    paddingBottom: 24,
  },
  header: {
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B3A2E',
    lineHeight: 30,
    paddingTop: 2,
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
  statsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  seriesSection: {
    gap: 10,
  },
  seriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  seriesLink: {
    color: '#1E6F5C',
    fontWeight: '600',
  },
  seriesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    gap: 6,
  },
  seriesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  seriesName: {
    fontWeight: '700',
    color: '#1B3A2E',
    fontSize: 16,
    flex: 1,
  },
  seriesMeta: {
    color: '#3F5D52',
    fontSize: 13,
  },
  seriesPill: {
    backgroundColor: '#1E6F5C',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seriesPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  seriesEmpty: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
  },
  seriesEmptyText: {
    color: '#3F5D52',
    fontSize: 13,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  badgeLink: {
    color: '#1E6F5C',
    fontWeight: '600',
  },
  badgeRow: {
    paddingBottom: 4,
  },
  badgeCard: {
    width: 180,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 12,
  },
  badgeUnlocked: {
    backgroundColor: '#FFF6DA',
    borderColor: '#F4D98C',
  },
  badgeLocked: {
    backgroundColor: '#EEF1EE',
    borderColor: '#D8E1D8',
  },
  badgeEmpty: {
    backgroundColor: '#FFF6DA',
    borderColor: '#F4D98C',
  },
  badgeName: {
    fontWeight: '700',
    color: '#1B3A2E',
  },
  badgeEmptyTitle: {
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
