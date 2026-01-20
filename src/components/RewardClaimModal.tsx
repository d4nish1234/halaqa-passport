import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { SwipeToConfirm } from './SwipeToConfirm';

export function RewardClaimModal({
  visible,
  seriesName,
  rewardTarget,
  isClaiming,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  seriesName: string;
  rewardTarget: number;
  isClaiming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Claim your reward</Text>
          <Text style={styles.text}>
            {seriesName} reward for {rewardTarget} check-ins.
          </Text>
          <Text style={styles.hint}>Show this to an admin to exchange for a reward.</Text>
          <SwipeToConfirm
            label={isClaiming ? 'Claiming...' : 'Swipe to claim'}
            onConfirmed={onConfirm}
            disabled={isClaiming}
          />
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
            onPress={onClose}
            disabled={isClaiming}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <PrimaryButton title="Close" onPress={onClose} disabled={isClaiming} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 28, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    gap: 12,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B3A2E',
    textAlign: 'center',
  },
  text: {
    color: '#3F5D52',
    textAlign: 'center',
  },
  hint: {
    color: '#1B3A2E',
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    alignItems: 'center',
  },
  secondaryPressed: {
    opacity: 0.8,
  },
  secondaryText: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 14,
  },
});
