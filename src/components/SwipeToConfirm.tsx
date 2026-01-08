import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

export function SwipeToConfirm({
  label = 'Swipe to claim',
  onConfirmed,
  disabled,
}: {
  label?: string;
  onConfirmed: () => void;
  disabled?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbWidth = 48;
  const maxTranslate = Math.max(0, trackWidth - thumbWidth - 8);

  const resetThumb = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > 2,
        onPanResponderMove: (_, gesture) => {
          if (disabled) {
            return;
          }
          const clamped = Math.max(0, Math.min(gesture.dx, maxTranslate));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled) {
            resetThumb();
            return;
          }
          const clamped = Math.max(0, Math.min(gesture.dx, maxTranslate));
          if (clamped >= maxTranslate * 0.7 && maxTranslate > 0) {
            Animated.timing(translateX, {
              toValue: maxTranslate,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              onConfirmed();
              resetThumb();
            });
          } else {
            resetThumb();
          }
        },
      }),
    [disabled, maxTranslate, onConfirmed, translateX]
  );

  return (
    <View
      style={[styles.track, disabled && styles.trackDisabled]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Text style={styles.label}>{label}</Text>
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
          disabled && styles.thumbDisabled,
        ]}
      >
        <Text style={styles.thumbText}>›</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 48,
    backgroundColor: '#E7EFE8',
    borderRadius: 999,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  trackDisabled: {
    opacity: 0.6,
  },
  label: {
    textAlign: 'center',
    color: '#3F5D52',
    fontWeight: '600',
  },
  thumb: {
    position: 'absolute',
    left: 8,
    width: 48,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E6F5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDisabled: {
    backgroundColor: '#92B3A7',
  },
  thumbText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
});
