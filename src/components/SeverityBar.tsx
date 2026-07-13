import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { clearColor, colors, notRecordedColor, radius, severityScale, spacing } from '../app/theme';
import { AppText } from './AppText';

interface SeverityBarProps {
  /** 0 = clear, 1-5 = severity, null = not recorded that day. */
  score: number | null;
}

const STOPS = [1, 2, 3, 4, 5] as const;
const TRACK_HEIGHT = 28;
const MARKER_SIZE = 40;

/**
 * Read-only severity display, for the Today tab. Three states: not recorded
 * (ghosted track, dashed Clear pill), clear/0 (dimmed track, filled Clear
 * pill), scored 1-5 (colored track with a marker, outlined Clear pill).
 * See SeverityInput for the editable version used on the Log screen.
 *
 * The marker is an absolutely-positioned sibling of the segment row (not
 * nested inside one segment's box), same as SeverityInput's thumb — sizing it
 * bigger than TRACK_HEIGHT to show the full cactus icon would otherwise get
 * it clipped by whichever adjacent segment renders on top of it.
 */
export function SeverityBar({ score }: SeverityBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const isClear = score === 0;
  const isNotRecorded = score === null;

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const markerLeft =
    trackWidth > 0 && score ? (score - 0.5) * (trackWidth / STOPS.length) - MARKER_SIZE / 2 : 0;

  return (
    <View style={styles.row}>
      <View
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
      </View>

      <View style={styles.track} onLayout={handleLayout}>
        <View style={styles.segments}>
          {STOPS.map((stop) => (
            <View
              key={stop}
              style={[
                styles.segment,
                {
                  backgroundColor: isNotRecorded ? 'transparent' : severityScale[stop],
                  borderColor: isNotRecorded ? notRecordedColor : 'transparent',
                  borderWidth: isNotRecorded ? 1 : 0,
                  opacity: isClear ? 0.35 : 1,
                },
              ]}
            />
          ))}
        </View>

        {!isNotRecorded && !isClear && trackWidth > 0 ? (
          <View style={[styles.marker, { left: markerLeft }]} pointerEvents="none">
            <Image
              source={require('../../assets/cactus-images/cactus-slider-icon.png')}
              style={styles.markerImage}
            />
            <AppText variant="label" color={colors.onPrimary}>
              {score}
            </AppText>
          </View>
        ) : null}
      </View>
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
  marker: {
    position: 'absolute',
    top: (TRACK_HEIGHT - MARKER_SIZE) / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  },
});
