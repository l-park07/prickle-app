import { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clearColor, colors, notRecordedColor, radius, severityScale, spacing } from '../app/theme';
import { AppText } from './AppText';

interface SeverityInputProps {
  /** 0-5 (0 = Clear), or null = not recorded that day. */
  value: number | null;
  onChange: (value: number | null) => void;
}

const STOPS = [1, 2, 3, 4, 5] as const;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 40;

/**
 * Editable severity slider, for the Log screen. Three mutually exclusive
 * states: not recorded (null), Clear (0), and scored (1-5).
 *
 * Tapping the cactus thumb sets the site to not-recorded (null) — distinct
 * from Clear, which means "recorded, and clear." Since there's no thumb to
 * tap once null, the whole (now ghosted) track becomes the tap target again:
 * tapping/dragging it sets a 1-5 value same as normal. The Clear pill also
 * works from null — it sets 0 directly rather than trying to "restore" a
 * prior value, since tapping Clear is itself a deliberate, definite action.
 *
 * `value` should be initialized by the caller to the site's previous score
 * (see getPreviousSiteScore in chartSelectors.ts), falling back to 3 for a
 * new site or one with no prior data — this component doesn't reach into the
 * db itself, it just renders whatever `value` it's given.
 */
export function SeverityInput({ value, onChange }: SeverityInputProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const isClear = value === 0;
  const isNotRecorded = value === null;

  // Remembers the last non-zero score so tapping Clear again (while already
  // clear) restores the slider instead of leaving it stuck at 0.
  const lastNonZeroRef = useRef(value !== null && value > 0 ? value : 3);
  useEffect(() => {
    if (value !== null && value > 0) lastNonZeroRef.current = value;
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

  const handleClearPress = () => {
    if (isNotRecorded) {
      onChange(0);
    } else {
      onChange(isClear ? lastNonZeroRef.current : 0);
    }
  };

  const thumbTap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) onChange(null);
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => handlePositionX(e.x))
    .onUpdate((e) => handlePositionX(e.x))
    .requireExternalGestureToFail(thumbTap);

  const showThumb = !isClear && !isNotRecorded && trackWidth > 0;
  const thumbLeft =
    trackWidth > 0 && value !== null
      ? (value - 0.5) * (trackWidth / STOPS.length) - THUMB_SIZE / 2
      : 0;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleClearPress}
        accessibilityRole="button"
        accessibilityLabel="Clear"
        style={[
          styles.pill,
          isClear ? styles.pillClear : null,
          isNotRecorded ? styles.pillNotRecorded : null,
        ]}
      >
        <AppText
          variant="label"
          color={isClear ? colors.onPrimary : isNotRecorded ? notRecordedColor : colors.textPrimary}
        >
          Clear
        </AppText>
      </Pressable>

      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={handleLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Severity"
          accessibilityValue={{ min: 0, max: 5, now: value ?? undefined }}
          accessibilityState={{ disabled: isNotRecorded }}
        >
          <View style={styles.segments}>
            {STOPS.map((stop) => (
              <View
                key={stop}
                style={[
                  styles.segment,
                  isNotRecorded
                    ? styles.segmentNotRecorded
                    : { backgroundColor: severityScale[stop], opacity: isClear ? 0.3 : 1 },
                ]}
              />
            ))}
          </View>
          {showThumb ? (
            <GestureDetector gesture={thumbTap}>
              <View
                style={[styles.thumb, { left: thumbLeft }]}
                accessibilityRole="button"
                accessibilityLabel="Mark as not recorded"
              >
                <Image
                  source={require('../../assets/cactus-images/cactus-slider-icon.png')}
                  style={styles.thumbImage}
                />
                <AppText variant="label" color={colors.onPrimary}>
                  {value}
                </AppText>
              </View>
            </GestureDetector>
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
  pillNotRecorded: {
    borderStyle: 'dashed',
    borderColor: notRecordedColor,
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
  segmentNotRecorded: {
    backgroundColor: 'transparent',
    borderColor: notRecordedColor,
    borderWidth: 1,
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
