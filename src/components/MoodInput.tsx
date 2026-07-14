import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, radius, severityScale, spacing } from '../app/theme';
import { AppText } from './AppText';

interface MoodInputProps {
  /** Always a definite 1-5 — no Clear/not-recorded state for mood. */
  value: number;
  onChange: (value: number) => void;
}

const STOPS = [1, 2, 3, 4, 5] as const;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 40;

/**
 * Editable mood/stress slider, for the Log screen. Same drag/tap track as
 * SeverityInput, but always a definite value (no Clear pill, no not-recorded
 * state) and flanked by happy/sad icons like MoodBar instead of a pill.
 */
export function MoodInput({ value, onChange }: MoodInputProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const handlePositionX = (x: number) => {
    if (trackWidth <= 0) return;
    const clamped = Math.min(Math.max(x, 0), trackWidth);
    const stopWidth = trackWidth / STOPS.length;
    const index = Math.min(STOPS.length - 1, Math.floor(clamped / stopWidth));
    onChange(STOPS[index]);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => handlePositionX(e.x))
    .onUpdate((e) => handlePositionX(e.x));

  const thumbLeft =
    trackWidth > 0 ? (value - 0.5) * (trackWidth / STOPS.length) - THUMB_SIZE / 2 : 0;

  return (
    <View style={styles.row}>
      <Ionicons name="happy-outline" size={24} color={colors.textSecondary} />

      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={handleLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Mood"
          accessibilityValue={{ min: 1, max: 5, now: value }}
        >
          <View style={styles.segments}>
            {STOPS.map((stop) => (
              <View
                key={stop}
                style={[styles.segment, { backgroundColor: severityScale[stop] }]}
              />
            ))}
          </View>
          {trackWidth > 0 ? (
            <View style={[styles.thumb, { left: thumbLeft }]} pointerEvents="none">
              <Image
                source={require('../../assets/cactus-images/cactus-slider-icon.png')}
                style={styles.thumbImage}
              />
              <AppText variant="label" color={colors.onPrimary}>
                {value}
              </AppText>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <Ionicons name="sad-outline" size={24} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  segments: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    borderRadius: radius.sm,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
});
