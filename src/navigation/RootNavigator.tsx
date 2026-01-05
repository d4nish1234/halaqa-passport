import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useProfile } from '../context/ProfileContext';
import { BadgesScreen } from '../screens/BadgesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ScanScreen } from '../screens/ScanScreen';
import type { ParticipantStats } from '../types';
import type { SeriesSummary } from '../types';
import { SeriesScreen } from '../screens/SeriesScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Scan: undefined;
  Badges: { stats: ParticipantStats };
  Series: { series: SeriesSummary[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      {profile ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Halaqa Passport' }} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan QR' }} />
          <Stack.Screen name="Badges" component={BadgesScreen} options={{ title: 'Badges' }} />
          <Stack.Screen name="Series" component={SeriesScreen} options={{ title: 'Series' }} />
        </>
      ) : (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
