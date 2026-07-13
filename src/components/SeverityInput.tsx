import { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clearColor, colors, radius, severityScale, spacing } from '../app/theme';
import { AppText } from './AppText';

interface SeverityInputProps {
  /** 0-5; 0 = Clear. Always a definite value once mounted — see doc below. */
  value: number;
  onChange: (value: number) => void;
}

const STOPS = [1, 2, 3, 4, 5] as const;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 40;

/**
 * Editable severity slider, for the Log screen. Clear and the 1-5 track are
 * mutually exclusive: tapping Clear sets 0; tapping/dragging the track sets
 * 1-5 and implicitly un-clears (the parent's `value` just changes).
 *
 * `value` should be initialized by the caller to the site's previous score
 * (see getPreviousSiteScore in chartSelectors.ts), falling back to 3 for a
 * new site or one with no prior data — this component doesn't reach into the
 * db itself, it just renders whatever `value` it's given.
 */
export function SeverityInput({ value, onChange }: SeverityInputProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const isClear = value === 0;

  // Remembers the last non-zero score so tapping Clear again (while already
  // clear) restores the slider instead of leaving it stuck at 0.
  const lastNonZeroRef = useRef(value > 0 ? value : 3);
  useEffect(() => {
    if (value > 0) lastNonZeroRef.current = value;
  }, [value]);

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
      <Pressable
        onPress={() => onChange(isClear ? lastNonZeroRef.current : 0)}
        accessibilityRole="button"
        accessibilityLabel="Clear"
        style={[styles.pill, isClear ? styles.pillClear : null]}
      >
        <AppText variant="label" color={isClear ? colors.onPrimary : colors.textPrimary}>
          Clear
        </AppText>
      </Pressable>

      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={handleLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Severity"
          accessibilityValue={{ min: 0, max: 5, now: value }}
        >
          <View style={styles.segments}>
            {STOPS.map((stop) => (
              <View
                key={stop}
                style={[
                  styles.segment,
                  { backgroundColor: severityScale[stop], opacity: isClear ? 0.3 : 1 },
                ]}
              />
            ))}
          </View>
          {!isClear && trackWidth > 0 ? (
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillClear: {
    backgroundColor: clearColor,
    borderColor: clearColor,
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
