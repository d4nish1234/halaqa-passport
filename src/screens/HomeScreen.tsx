import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { RewardClaimModal } from '../components/RewardClaimModal';
import { RewardTracker } from '../components/RewardTracker';
import { useProfile } from '../context/ProfileContext';
import { getBadges } from '../lib/badges';
import {
  fetchActiveSeries,
  fetchParticipantAttendanceDates,
  fetchParticipantAttendanceRecords,
  fetchParticipantAttendanceForSeries,
  fetchParticipantRewardClaims,
  fetchParticipantNotificationStatus,
  fetchSeriesByIds,
  fetchSessionsForSeries,
  enableNotifications,
  claimSeriesReward,
  updateParticipantLastSeen,
} from '../lib/firestore';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { calculateSeriesStreak, calculateTotals } from '../lib/stats';
import { ParticipantStats, SeriesSummary } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { RouteProp } from '@react-navigation/native';

export function HomeScreen() {
  const { profile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
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
  const [isCheckInModalVisible, setIsCheckInModalVisible] = useState(false);
  const [isEnablingReminders, setIsEnablingReminders] = useState(false);
  const [isLoadingReminderStatus, setIsLoadingReminderStatus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const confettiOrigin = { x: Dimensions.get('window').width / 2, y: 0 };
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [claimSeriesId, setClaimSeriesId] = useState<string | null>(null);
  const [claimSeriesName, setClaimSeriesName] = useState<string | null>(null);
  const [claimRewardTarget, setClaimRewardTarget] = useState<number | null>(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimConfettiKey, setClaimConfettiKey] = useState(0);
  const [isClaimConfettiVisible, setIsClaimConfettiVisible] = useState(false);
  const badges = getBadges(stats);
  const earnedBadges = badges.filter((badge) => badge.unlocked);
  const participantIdSuffix = profile?.participantId
    ? profile.participantId.slice(-4)
    : '';
  const displayName = profile ? profile.nickname : '';

  const loadStats = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateParticipantLastSeen(profile.participantId);
      const [attendanceDates, attendanceRecords, activeSeries, rewardClaims] =
        await Promise.all([
        fetchParticipantAttendanceDates(profile.participantId),
        fetchParticipantAttendanceRecords(profile.participantId),
        fetchActiveSeries(),
        fetchParticipantRewardClaims(profile.participantId),
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
          rewards: Array.isArray(series?.rewards) ? series?.rewards : undefined,
          claimedRewards: rewardClaims[seriesId] ?? [],
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

  useFocusEffect(
    useCallback(() => {
      if (route.params?.showCheckInSuccess) {
        setIsCheckInModalVisible(true);
        setNotificationsEnabled(null);
        setConfettiKey((prev) => prev + 1);
        navigation.setParams({ showCheckInSuccess: undefined });

        if (profile) {
          setIsLoadingReminderStatus(true);
          fetchParticipantNotificationStatus(profile.participantId)
            .then((status) => {
              setNotificationsEnabled(status.notificationsEnabled);
            })
            .catch(() => {
              setNotificationsEnabled(false);
            })
            .finally(() => {
              setIsLoadingReminderStatus(false);
            });
        }
      }
    }, [navigation, profile, route.params?.showCheckInSuccess])
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isClaimConfettiVisible) {
      timeout = setTimeout(() => {
        setIsClaimConfettiVisible(false);
      }, 1800);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isClaimConfettiVisible]);

  if (!profile) {
    return null;
  }

  const handleEnableReminders = async () => {
    if (isEnablingReminders) {
      setIsCheckInModalVisible(false);
      return;
    }

    setIsEnablingReminders(true);

    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert(
          'Notifications disabled',
          'You can enable reminders later in Settings.'
        );
        return;
      }

      await enableNotifications(profile.participantId, token);
      setNotificationsEnabled(true);
      setIsCheckInModalVisible(false);
    } catch (err) {
      Alert.alert('Could not enable reminders', 'Please try again.');
    } finally {
      setIsEnablingReminders(false);
    }
  };

  const handleOpenClaimModal = (seriesId: string, seriesName: string, reward: number) => {
    setClaimSeriesId(seriesId);
    setClaimSeriesName(seriesName);
    setClaimRewardTarget(reward);
    setIsClaimModalVisible(true);
  };

  const handleClaimReward = async () => {
    if (!profile || !claimSeriesId || !claimRewardTarget) {
      setIsClaimModalVisible(false);
      return;
    }

    setIsClaimingReward(true);
    try {
      await claimSeriesReward(profile.participantId, claimSeriesId, claimRewardTarget);
      setSeriesSummaries((prev) =>
        prev.map((item) =>
          item.id === claimSeriesId
            ? {
                ...item,
                claimedRewards: Array.from(
                  new Set([...(item.claimedRewards ?? []), claimRewardTarget])
                ),
              }
            : item
        )
      );
      setCurrentSeries((prev) =>
        prev && prev.id === claimSeriesId
          ? {
              ...prev,
              claimedRewards: Array.from(
                new Set([...(prev.claimedRewards ?? []), claimRewardTarget])
              ),
            }
          : prev
      );
      setClaimConfettiKey((prev) => prev + 1);
      setIsClaimConfettiVisible(true);
      setIsClaimModalVisible(false);
    } catch (err) {
      Alert.alert('Could not claim reward', 'Please try again.');
    } finally {
      setIsClaimingReward(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {isCheckInModalVisible ? (
          <View style={styles.confetti} pointerEvents="none">
            <ConfettiCannon
              key={`confetti-${confettiKey}`}
              count={120}
              origin={confettiOrigin}
              fadeOut
            />
          </View>
        ) : null}
        {isClaimConfettiVisible ? (
          <View style={styles.confetti} pointerEvents="none">
            <ConfettiCannon
              key={`claim-confetti-${claimConfettiKey}`}
              count={80}
              origin={confettiOrigin}
              fadeOut
            />
          </View>
        ) : null}
        <Modal
          transparent
          visible={isCheckInModalVisible}
          animationType="fade"
          onRequestClose={() => setIsCheckInModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>You are checked-in!</Text>
              <Text style={styles.modalText}>Great job making it to halaqa today.</Text>
              {isLoadingReminderStatus ? (
                <ActivityIndicator />
              ) : notificationsEnabled ? (
                <Text style={styles.modalText}>
                  Reminders are already enabled. You can manage them in Settings.
                </Text>
              ) : (
                <Text style={styles.modalText}>
                  Want reminders a few hours before sessions?
                </Text>
              )}
              <View style={styles.modalActions}>
                {!isLoadingReminderStatus && notificationsEnabled === false ? (
                  <PrimaryButton
                    title={isEnablingReminders ? 'Enabling...' : 'Enable reminders'}
                    onPress={handleEnableReminders}
                    disabled={isEnablingReminders}
                  />
                ) : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSecondaryButton,
                    pressed && styles.modalSecondaryPressed,
                  ]}
                  onPress={() => setIsCheckInModalVisible(false)}
                  disabled={isEnablingReminders}
                >
                  <Text style={styles.modalSecondaryText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {claimSeriesName && claimRewardTarget !== null ? (
          <RewardClaimModal
            visible={isClaimModalVisible}
            seriesName={claimSeriesName}
            rewardTarget={claimRewardTarget}
            isClaiming={isClaimingReward}
            onClose={() => setIsClaimModalVisible(false)}
            onConfirm={handleClaimReward}
          />
        ) : null}
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Salaam, {displayName}!</Text>
            {participantIdSuffix ? (
              <Text style={styles.userId}>User id: {participantIdSuffix}</Text>
            ) : null}
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
                <RewardTracker
                  rewards={currentSeries.rewards}
                  claimedRewards={currentSeries.claimedRewards}
                  sessionsAttended={currentSeries.sessionsAttended}
                  onClaimPress={(rewardTarget) =>
                    handleOpenClaimModal(
                      currentSeries.id,
                      currentSeries.name,
                      rewardTarget
                    )
                  }
                />
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
  userId: {
    color: '#3F5D52',
    fontSize: 13,
    fontWeight: '600',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 28, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B3A2E',
    textAlign: 'center',
  },
  modalText: {
    color: '#3F5D52',
    textAlign: 'center',
  },
  modalActions: {
    gap: 10,
  },
  modalSecondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    alignItems: 'center',
  },
  modalSecondaryPressed: {
    opacity: 0.8,
  },
  modalSecondaryText: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 15,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
