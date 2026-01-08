import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getRewardStatus } from '../lib/rewards';

export function RewardTracker({
  rewards,
  claimedRewards,
  sessionsAttended,
  onClaimPress,
}: {
  rewards?: number[];
  claimedRewards?: number[];
  sessionsAttended: number;
  onClaimPress: (rewardTarget: number) => void;
}) {
  const status = getRewardStatus({
    rewards,
    claimedRewards,
    sessionsAttended,
  });

  if (!status) {
    return null;
  }

  if (status.allClaimed) {
    return <Text style={styles.completeText}>All rewards claimed.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Reward progress: {status.currentCount}/{status.target}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${status.progress * 100}%` }]} />
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.claimButton,
          !status.canClaim && styles.claimButtonDisabled,
          pressed && status.canClaim && styles.claimButtonPressed,
        ]}
        onPress={() => onClaimPress(status.target)}
        disabled={!status.canClaim}
      >
        <Text style={styles.claimText}>Claim reward</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 6,
  },
  label: {
    color: '#3F5D52',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E7EFE8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E6F5C',
  },
  claimButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1E6F5C',
  },
  claimButtonDisabled: {
    backgroundColor: '#A8BDB5',
  },
  claimButtonPressed: {
    opacity: 0.8,
  },
  claimText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  completeText: {
    color: '#1B3A2E',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 8,
  },
});
