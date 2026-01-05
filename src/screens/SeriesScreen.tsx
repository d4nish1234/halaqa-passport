import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route }: Props) {
  const series = route.params?.series ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Series</Text>
          <View style={styles.list}>
            {series.length ? (
              series.map((item) => (
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
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Scan QR code to join a series.</Text>
              </View>
            )}
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
});
