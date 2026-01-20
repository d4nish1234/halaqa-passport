import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { RewardClaimModal } from '../components/RewardClaimModal';
import { RewardTracker } from '../components/RewardTracker';
import { useProfile } from '../context/ProfileContext';
import {
  claimSeriesReward,
  fetchParticipantAttendanceRecords,
  fetchParticipantRewardClaims,
  fetchSeriesByIds,
} from '../lib/firestore';
import { RootStackParamList } from '../navigation/RootNavigator';
import type { SeriesSummary } from '../types';
import ConfettiCannon from 'react-native-confetti-cannon';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route }: Props) {
  const { profile } = useProfile();
  const providedSeries = route.params?.series;
  const [series, setSeries] = useState<SeriesSummary[]>(providedSeries ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [claimSeriesId, setClaimSeriesId] = useState<string | null>(null);
  const [claimSeriesName, setClaimSeriesName] = useState<string | null>(null);
  const [claimRewardTarget, setClaimRewardTarget] = useState<number | null>(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimConfettiKey, setClaimConfettiKey] = useState(0);
  const [isClaimConfettiVisible, setIsClaimConfettiVisible] = useState(false);
  const confettiOrigin = { x: Dimensions.get('window').width / 2, y: 0 };

  useEffect(() => {
    if (providedSeries) {
      setSeries(providedSeries);
    }
  }, [providedSeries]);

  const loadSeries = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [attendanceRecords, rewardClaims] = await Promise.all([
        fetchParticipantAttendanceRecords(profile.participantId),
        fetchParticipantRewardClaims(profile.participantId),
      ]);

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
        const seriesDoc = seriesById.get(seriesId);
        const entry = seriesMap.get(seriesId);
        const isCompleted = Boolean(seriesDoc?.completed);

        return {
          id: seriesId,
          name: seriesDoc?.name ?? seriesId,
          sessionsAttended: entry?.count ?? 0,
          lastAttendedAt: entry?.lastAttendedAt ?? null,
          isActive: Boolean(seriesDoc?.isActive),
          isCompleted,
          rewards: Array.isArray(seriesDoc?.rewards) ? seriesDoc?.rewards : undefined,
          claimedRewards: rewardClaims[seriesId] ?? [],
        };
      });

      summaries.sort(
        (a, b) => (b.lastAttendedAt ?? 0) - (a.lastAttendedAt ?? 0)
      );

      setSeries(summaries);
    } catch (err) {
      setError('We had trouble loading your series.');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (route.params?.series === undefined) {
      loadSeries();
    }
  }, [loadSeries, route.params?.series]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.page}>
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
        {claimSeriesName && claimRewardTarget !== null ? (
          <RewardClaimModal
            visible={isClaimModalVisible}
            seriesName={claimSeriesName}
            rewardTarget={claimRewardTarget}
            isClaiming={isClaimingReward}
            onClose={() => setIsClaimModalVisible(false)}
            onConfirm={async () => {
              if (!profile || !claimSeriesId || !claimRewardTarget) {
                setIsClaimModalVisible(false);
                return;
              }

              setIsClaimingReward(true);
              try {
                await claimSeriesReward(
                  profile.participantId,
                  claimSeriesId,
                  claimRewardTarget
                );
                setSeries((prev) =>
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
                setClaimConfettiKey((prev) => prev + 1);
                setIsClaimConfettiVisible(true);
                setIsClaimModalVisible(false);
              } catch (err) {
                Alert.alert('Could not claim reward', 'Please try again.');
              } finally {
                setIsClaimingReward(false);
              }
            }}
          />
        ) : null}
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Series</Text>
          <View style={styles.list}>
            {isLoading ? <ActivityIndicator /> : null}
            {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}
            {!isLoading && !error && series.length
              ? series.map((item) => (
                  <View key={item.id} style={styles.seriesCard}>
                    <View style={styles.seriesHeader}>
                      <Text style={styles.seriesName}>{item.name}</Text>
                      {item.isCompleted ? (
                        <View style={styles.seriesPill}>
                          <Text style={styles.seriesPillText}>Completed</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.seriesMeta}>
                      {item.sessionsAttended} sessions attended
                    </Text>
                    <RewardTracker
                      rewards={item.rewards}
                      claimedRewards={item.claimedRewards}
                      sessionsAttended={item.sessionsAttended}
                      onClaimPress={(rewardTarget) => {
                        setClaimSeriesId(item.id);
                        setClaimSeriesName(item.name);
                        setClaimRewardTarget(rewardTarget);
                        setIsClaimModalVisible(true);
                      }}
                    />
                  </View>
                ))
              : null}
            {!isLoading && !error && series.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Scan QR code to join a series.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <FooterNav series={series} />
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
  seriesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    gap: 8,
  },
  seriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3EAE4',
  },
  emptyText: {
    color: '#3F5D52',
    fontSize: 13,
  },
  error: {
    color: '#B42318',
    fontWeight: '600',
  },
});
