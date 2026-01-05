import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { getBadges } from '../lib/badges';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Badges'>;

export function BadgesScreen({ route }: Props) {
  const stats = route.params?.stats ?? {
    totalCheckIns: 0,
    currentStreak: 0,
    highestStreak: 0,
    seriesParticipated: 0,
    lastCheckInDate: null,
  };
  const badges = getBadges(stats);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>My Badges</Text>
          <View style={styles.list}>
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
});
