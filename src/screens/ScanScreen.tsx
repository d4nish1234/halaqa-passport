import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FooterNav } from '../components/FooterNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';
import { checkInSession, recordSeriesParticipation } from '../lib/firestore';
import { parseSessionPayload } from '../lib/qr';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function ScanScreen() {
  const { profile } = useProfile();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'success' | 'error' | null>(null);

  if (!profile) {
    return null;
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const isPermanentlyDenied = permission.canAskAgain === false;
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Time</Text>
        <Text style={styles.permissionText}>
          We need the camera to scan the QR code.
        </Text>
        {isPermanentlyDenied ? (
          <Text style={styles.permissionHint}>
            Camera access is blocked. Enable it in your device settings.
          </Text>
        ) : null}
        <PrimaryButton
          title={isPermanentlyDenied ? 'Open Settings' : 'Allow Camera'}
          onPress={
            isPermanentlyDenied ? () => Linking.openSettings() : requestPermission
          }
        />
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setResultMessage(null);
    setResultType(null);

    const payload = parseSessionPayload(data);
    if (!payload) {
      setResultType('error');
      setResultMessage('That code looks different. Please try again.');
      setIsProcessing(false);
      setIsScanningEnabled(false);
      return;
    }

    try {
      const response = await checkInSession({
        ...payload,
        participantId: profile.participantId,
      });
      if (response.ok) {
        setIsScanningEnabled(false);
        recordSeriesParticipation(profile.participantId, payload.seriesId).catch((err) => {
          console.warn('series:record:error', err);
        });
        navigation.navigate('Home', {
          showCheckInSuccess: true,
        });
        return;
      } else {
        setResultType('error');
        setResultMessage(response.message || 'Check-in did not work.');
      }
    } catch (err) {
      setResultType('error');
      setResultMessage('We could not reach the check-in system.');
    } finally {
      setIsProcessing(false);
      setIsScanningEnabled(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={
              isProcessing || !isScanningEnabled ? undefined : handleBarcodeScanned
            }
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
        </View>

        <View style={styles.bottomSheet}>
          <Text style={styles.bottomTitle}>Hold the QR code inside the frame</Text>
          <Text style={styles.bottomSubtitle}>We will check you in right away.</Text>

          {isProcessing ? <ActivityIndicator /> : null}

          {resultMessage ? (
            <View
              style={
                resultType === 'success'
                  ? [styles.resultBox, styles.resultSuccess]
                  : [styles.resultBox, styles.resultError]
              }
            >
              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          ) : null}

          {resultMessage ? (
            <PrimaryButton
              title="Scan Again"
              onPress={() => {
                setResultMessage(null);
                setResultType(null);
                setIsScanningEnabled(true);
              }}
            />
          ) : null}
        </View>
        <FooterNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1C17',
  },
  page: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F2EA',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#F7F2EA',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  permissionText: {
    color: '#3F5D52',
    textAlign: 'center',
  },
  permissionHint: {
    color: '#3F5D52',
    textAlign: 'center',
    fontSize: 12,
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#F7F2EA',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3A2E',
  },
  bottomSubtitle: {
    color: '#3F5D52',
  },
  resultBox: {
    padding: 12,
    borderRadius: 12,
  },
  resultSuccess: {
    backgroundColor: '#E0F2E9',
  },
  resultError: {
    backgroundColor: '#FCE8E6',
  },
  resultText: {
    fontWeight: '600',
    color: '#1B3A2E',
  },
});
