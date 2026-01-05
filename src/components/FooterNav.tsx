import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ParticipantStats, SeriesSummary } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type FooterNavProps = {
  stats?: ParticipantStats;
  series?: SeriesSummary[];
};

export function FooterNav({ stats, series }: FooterNavProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Pressable style={styles.navItem} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.navLabel}>Home</Text>
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Badges', { stats })}
      >
        <Text style={styles.navLabel}>Badges</Text>
      </Pressable>
      <Pressable style={styles.cameraButton} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.cameraLabel}>Scan</Text>
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Series', { series })}
      >
        <Text style={styles.navLabel}>Series</Text>
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.navLabel}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E3EAE4',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    color: '#3F5D52',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E6F5C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 4,
    borderColor: '#F7F2EA',
  },
  cameraLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
