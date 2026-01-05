import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FooterNav } from '../components/FooterNav';

export function SettingsScreen() {
  const privacyPolicyUrl =
    'https://raw.githubusercontent.com/d4nish1234/halaqa-passport/refs/heads/main/PRIVACY_POLICY.md';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <Pressable
            style={({ pressed }) => [styles.rowButton, pressed && styles.rowPressed]}
            onPress={() => Linking.openURL(privacyPolicyUrl)}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>i</Text>
            </View>
            <Text style={styles.rowLabel}>Privacy policy</Text>
          </Pressable>
        </View>
        <FooterNav />
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
  content: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  subtitle: {
    color: '#3F5D52',
  },
  rowButton: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowLabel: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 15,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#1E6F5C',
    fontWeight: '700',
    fontSize: 14,
  },
});
