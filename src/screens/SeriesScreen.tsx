import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { useProfile } from '../context/ProfileContext';
import { fetchParticipantAttendanceRecords, fetchSeriesByIds } from '../lib/firestore';
import { RootStackParamList } from '../navigation/RootNavigator';
import type { SeriesSummary } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route }: Props) {
  const { profile } = useProfile();
  const providedSeries = route.params?.series;
  const [series, setSeries] = useState<SeriesSummary[]>(providedSeries ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const attendanceRecords = await fetchParticipantAttendanceRecords(
        profile.participantId
      );

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
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
