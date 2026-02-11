import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import type { ParticipantStats, SeriesSummary } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type FooterNavProps = {
  stats?: ParticipantStats;
  series?: SeriesSummary[];
};

export function FooterNav({ stats, series }: FooterNavProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentRoute = useNavigationState((state) => state.routes[state.index]?.name);
  const isActive = (routeName: keyof RootStackParamList) => currentRoute === routeName;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
        accessibilityRole="tab"
        accessibilityLabel="Home"
        accessibilityHint="Navigate to home screen"
        accessibilityState={{ selected: isActive('Home') }}
      >
        <MaterialIcons
          name="home"
          size={20}
          color={isActive('Home') ? '#1E6F5C' : '#1B3A2E'}
        />
        <Text style={[styles.navLabel, isActive('Home') && styles.navLabelActive]}>
          Home
        </Text>
        {isActive('Home') ? <View style={styles.navIndicator} /> : null}
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Badges', { stats })}
        accessibilityRole="tab"
        accessibilityLabel="Badges"
        accessibilityHint="View your earned badges and achievements"
        accessibilityState={{ selected: isActive('Badges') }}
      >
        <MaterialIcons
          name="emoji-events"
          size={20}
          color={isActive('Badges') ? '#1E6F5C' : '#1B3A2E'}
        />
        <Text style={[styles.navLabel, isActive('Badges') && styles.navLabelActive]}>
          Badges
        </Text>
        {isActive('Badges') ? <View style={styles.navIndicator} /> : null}
      </Pressable>
      <Pressable
        style={styles.cameraButton}
        onPress={() => navigation.navigate('Scan')}
        accessibilityRole="button"
        accessibilityLabel="Scan QR code"
        accessibilityHint="Open camera to scan QR code for check-in"
      >
        <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
        <Text style={styles.cameraLabel}>Scan</Text>
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Series', { series })}
        accessibilityRole="tab"
        accessibilityLabel="Series"
        accessibilityHint="View all series you've participated in"
        accessibilityState={{ selected: isActive('Series') }}
      >
        <MaterialIcons
          name="list-alt"
          size={20}
          color={isActive('Series') ? '#1E6F5C' : '#1B3A2E'}
        />
        <Text style={[styles.navLabel, isActive('Series') && styles.navLabelActive]}>
          Series
        </Text>
        {isActive('Series') ? <View style={styles.navIndicator} /> : null}
      </Pressable>
      <Pressable
        style={styles.navItem}
        onPress={() => navigation.navigate('Settings')}
        accessibilityRole="tab"
        accessibilityLabel="Settings"
        accessibilityHint="Manage your profile and app settings"
        accessibilityState={{ selected: isActive('Settings') }}
      >
        <MaterialIcons
          name="settings"
          size={20}
          color={isActive('Settings') ? '#1E6F5C' : '#1B3A2E'}
        />
        <Text style={[styles.navLabel, isActive('Settings') && styles.navLabelActive]}>
          Settings
        </Text>
        {isActive('Settings') ? <View style={styles.navIndicator} /> : null}
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
    gap: 2,
  },
  navLabel: {
    color: '#3F5D52',
    fontSize: 10,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#1E6F5C',
  },
  navIndicator: {
    marginTop: 4,
    width: 20,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#1E6F5C',
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
    fontSize: 10,
  },
});
