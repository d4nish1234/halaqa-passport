import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
import { getAvatarById } from '../lib/avatars';
import { getAvatarLevelProgress } from '../lib/avatarProgress';
import { getBadges } from '../lib/badges';
import {
  fetchActiveSeries,
  fetchParticipantAttendanceDates,
  fetchParticipantAttendanceRecords,
  fetchParticipantAttendanceForSeries,
  fetchParticipantExperience,
  fetchParticipantNickname,
  fetchParticipantRewardClaims,
  fetchParticipantNotificationStatus,
  fetchSeriesByIds,
  fetchSessionsForSeries,
  enableNotifications,
  claimSeriesReward,
  updateParticipantLastSeen,
  updateParticipantAvatar,
} from '../lib/firestore';
import { saveProfile } from '../lib/storage';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { calculateSeriesStreak, calculateTotals } from '../lib/stats';
import { ParticipantStats, SeriesSummary } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { RouteProp } from '@react-navigation/native';

export function HomeScreen() {
  const { profile, setProfile } = useProfile();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [claimSeriesId, setClaimSeriesId] = useState<string | null>(null);
  const [claimSeriesName, setClaimSeriesName] = useState<string | null>(null);
  const [claimRewardTarget, setClaimRewardTarget] = useState<number | null>(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimConfettiKey, setClaimConfettiKey] = useState(0);
  const [isClaimConfettiVisible, setIsClaimConfettiVisible] = useState(false);
  const [experience, setExperience] = useState<number | null>(null);
  const [isEvolveHighlight, setIsEvolveHighlight] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarOpacity = useRef(new Animated.Value(1)).current;
  const evolvePulse = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const [isEvolving, setIsEvolving] = useState(false);
  const badges = getBadges(stats);
  const earnedBadges = badges.filter((badge) => badge.unlocked);
  const participantIdSuffix = profile?.participantId
    ? profile.participantId.slice(-4)
    : '';
  const displayName = profile ? profile.nickname : '';
  const avatar = useMemo(() => getAvatarById(profile?.avatarId ?? null), [profile?.avatarId]);
  const avatarFormEntry = profile?.avatarFormLevels?.find(
    (entry) => entry.avatarId === profile?.avatarId
  );
  const avatarFormLevel = Math.max(1, avatarFormEntry?.formLevel ?? 1);
  const avatarFormsCount = avatar?.forms.length ?? 0;
  const effectiveExperience = experience ?? stats.totalCheckIns;
  const userLevelProgress = useMemo(
    () => getAvatarLevelProgress(effectiveExperience),
    [effectiveExperience]
  );
  const lastEvolvedExperience = profile?.lastEvolvedExperience ?? -1;
  const canEvolve =
    avatar &&
    avatarFormLevel < avatarFormsCount &&
    effectiveExperience > 0 &&
    lastEvolvedExperience < effectiveExperience;
  const avatarImage =
    avatar && avatarFormsCount
      ? avatar.forms[Math.min(avatarFormLevel, avatarFormsCount) - 1]
      : null;
  const nextLevelIn = Math.max(0, userLevelProgress.nextLevelAt - effectiveExperience);

  const loadStats = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateParticipantLastSeen(profile.participantId);
      const [attendanceDates, attendanceRecords, activeSeries, rewardClaims, expValue] =
        await Promise.all([
        fetchParticipantAttendanceDates(profile.participantId),
        fetchParticipantAttendanceRecords(profile.participantId),
        fetchActiveSeries(),
        fetchParticipantRewardClaims(profile.participantId),
        fetchParticipantExperience(profile.participantId),
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
      setExperience(expValue);
    } catch (err) {
      setError('We had trouble loading your stats.');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const refreshNickname = useCallback(async () => {
    if (!profile) {
      return;
    }

    const nickname = await fetchParticipantNickname(profile.participantId);
    if (nickname && nickname !== profile.nickname) {
      const nextProfile = { ...profile, nickname };
      await saveProfile(nextProfile);
      setProfile(nextProfile);
    }
  }, [profile, setProfile]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([loadStats(), refreshNickname()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadStats, refreshNickname]);

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

  useEffect(() => {
    if (!canEvolve) {
      evolvePulse.stopAnimation();
      evolvePulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(evolvePulse, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(evolvePulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [canEvolve, evolvePulse]);

  const handleEvolvePrompt = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setIsEvolveHighlight(true);
    setTimeout(() => {
      setIsEvolveHighlight(false);
    }, 2000);
  };

  useEffect(() => {
    if (!isEvolving) {
      sparkleOpacity.setValue(0);
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0.9,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      setIsEvolving(false);
    });
  }, [isEvolving, sparkleOpacity]);

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

  const handleEvolveAvatar = async () => {
    if (!profile || !avatar || !canEvolve) {
      return;
    }

    const nextFormLevel = Math.min(avatarFormLevel + 1, avatarFormsCount);
    if (nextFormLevel === avatarFormLevel) {
      return;
    }

    setIsEvolving(true);
    Animated.parallel([
      Animated.timing(avatarOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(avatarScale, {
        toValue: 0.92,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      const nextFormLevels = Array.isArray(profile.avatarFormLevels)
        ? profile.avatarFormLevels.map((entry) =>
            entry.avatarId === avatar.id ? { ...entry, formLevel: nextFormLevel } : entry
          )
        : [];
      const hasEntry = nextFormLevels.some((entry) => entry.avatarId === avatar.id);
      if (!hasEntry) {
        nextFormLevels.push({ avatarId: avatar.id, formLevel: nextFormLevel });
      }
      const nextProfile = {
        ...profile,
        avatarFormLevels: nextFormLevels,
        lastEvolvedExperience: effectiveExperience,
      };

      try {
        await saveProfile(nextProfile);
        await updateParticipantAvatar(
          profile.participantId,
          avatar.id,
          nextFormLevels,
          effectiveExperience
        );
        setProfile(nextProfile);
      } catch (err) {
        Alert.alert('Could not evolve avatar', 'Please try again.');
      } finally {
        Animated.parallel([
          Animated.timing(avatarOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(avatarScale, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
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
          ref={scrollRef}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1E6F5C"
              colors={['#1E6F5C']}
            />
          }
        >
          <View style={styles.header}>
            {canEvolve ? (
              <Pressable
                style={({ pressed }) => [
                  styles.evolvePrompt,
                  pressed && styles.evolvePromptPressed,
                ]}
                onPress={handleEvolvePrompt}
              >
                <Text style={styles.evolvePromptText}>Evolve your avatar!</Text>
              </Pressable>
            ) : null}
            <Text style={styles.greeting}>Salaam, {displayName}!</Text>
            {participantIdSuffix ? (
              <Text style={styles.userId}>User id: {participantIdSuffix}</Text>
            ) : null}
            <Text style={styles.levelText}>Level {userLevelProgress.level}</Text>
            <Text style={styles.levelProgressText}>
              {nextLevelIn === 0
                ? 'Level up ready!'
                : `${nextLevelIn} check-ins to level ${userLevelProgress.level + 1}`}
            </Text>
            <Text style={styles.subtitle}>Tap Scan to check in with the QR.</Text>
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
          {avatar ? (
            <View style={styles.avatarSection}>
              <View style={styles.avatarImageCard}>
                <Animated.View
                  style={{
                    transform: [{ scale: avatarScale }],
                    opacity: avatarOpacity,
                  }}
                >
                  {avatarImage ? (
                    <Image source={avatarImage} style={styles.avatarImage} />
                  ) : null}
                </Animated.View>
                {isEvolving ? (
                  <Animated.View
                    style={[
                      styles.sparkleLayer,
                      {
                        opacity: sparkleOpacity,
                        transform: [{ scale: 1.02 }],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={[styles.sparkle, styles.sparkleOne]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleTwo]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleThree]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleFour]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleFive]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleSix]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleSeven]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleEight]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleNine]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleTen]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleEleven]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleTwelve]}>*</Text>
                    <Text style={[styles.sparkle, styles.sparkleThirteen]}>*</Text>
                  </Animated.View>
                ) : null}
              </View>
              {canEvolve ? (
                <Animated.View style={{ transform: [{ scale: evolvePulse }] }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.evolveButton,
                      styles.evolveButtonReady,
                      isEvolveHighlight && styles.evolveButtonHighlight,
                      pressed && styles.evolveButtonPressed,
                    ]}
                    onPress={handleEvolveAvatar}
                  >
                    <Text style={styles.evolveButtonText}>Evolve</Text>
                  </Pressable>
                </Animated.View>
              ) : null}
              <View style={styles.avatarTextCard}>
                <Text style={styles.avatarTitle}>{avatar.name}</Text>
                <Text style={styles.avatarLevel}>
                  Form {avatarFormLevel} of {avatarFormsCount}
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('AvatarPick')}
                  style={({ pressed }) => [
                    styles.changeAvatarButton,
                    pressed && styles.changeAvatarButtonPressed,
                  ]}
                >
                  <Text style={styles.changeAvatarText}>Change avatar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

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
    paddingTop: 10,
    gap: 24,
    paddingBottom: 24,
  },
  header: {
    gap: 6,
  },
  evolvePrompt: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E6F5C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  evolvePromptPressed: {
    opacity: 0.85,
  },
  evolvePromptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B3A2E',
    lineHeight: 30,
    paddingTop: 10,
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
  levelText: {
    color: '#1B3A2E',
    fontSize: 16,
    fontWeight: '700',
  },
  levelProgressText: {
    color: '#3F5D52',
    fontSize: 12,
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
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarTextCard: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  avatarImageCard: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  avatarImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  avatarTitle: {
    fontWeight: '700',
    color: '#1B3A2E',
    fontSize: 16,
  },
  avatarLevel: {
    color: '#3F5D52',
    fontSize: 14,
    fontWeight: '600',
  },
  changeAvatarButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#E7EFE8',
  },
  changeAvatarButtonPressed: {
    opacity: 0.8,
  },
  changeAvatarText: {
    color: '#1B3A2E',
    fontSize: 12,
    fontWeight: '600',
  },
  evolveButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1E6F5C',
    position: 'relative',
    overflow: 'hidden',
  },
  evolveButtonReady: {
    backgroundColor: '#2F8F72',
  },
  evolveButtonHighlight: {
    borderWidth: 2,
    borderColor: '#F4D98C',
    shadowColor: '#F4D98C',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  evolveButtonPressed: {
    opacity: 0.8,
  },
  evolveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  sparkleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    color: '#F4D98C',
    fontSize: 18,
    fontWeight: '700',
  },
  sparkleOne: {
    top: 24,
    left: 36,
  },
  sparkleTwo: {
    top: 20,
    right: 40,
    fontSize: 14,
  },
  sparkleThree: {
    bottom: 26,
    left: 50,
    fontSize: 12,
  },
  sparkleFour: {
    bottom: 30,
    right: 46,
  },
  sparkleFive: {
    top: 40,
    left: 90,
    fontSize: 12,
  },
  sparkleSix: {
    top: 60,
    right: 70,
    fontSize: 16,
  },
  sparkleSeven: {
    bottom: 60,
    left: 30,
    fontSize: 10,
  },
  sparkleEight: {
    bottom: 50,
    right: 28,
    fontSize: 18,
  },
  sparkleNine: {
    top: 90,
    left: 20,
    fontSize: 12,
  },
  sparkleTen: {
    top: 100,
    right: 18,
    fontSize: 14,
  },
  sparkleEleven: {
    bottom: 90,
    left: 80,
    fontSize: 11,
  },
  sparkleTwelve: {
    bottom: 80,
    right: 90,
    fontSize: 15,
  },
  sparkleThirteen: {
    top: 120,
    left: 120,
    fontSize: 10,
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
