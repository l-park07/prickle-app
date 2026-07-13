import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors, radius, severityScale, spacing } from '../app/theme';

interface MoodBarProps {
  /** 1-5; low = calm, high = stressed. Only rendered when mood was tracked that day. */
  score: number;
}

const STOPS = [1, 2, 3, 4, 5] as const;
const TRACK_HEIGHT = 28;
const MARKER_SIZE = 40;

/**
 * Read-only mood/stress track, styled like SeverityBar but flanked by a
 * smiley (calm, low score) and a sad face (stressed, high score) instead of
 * a Clear pill, and with no number drawn on the marker.
 *
 * The cactus marker is an absolutely-positioned sibling of the segment row
 * (not nested inside one segment's box) — same reasoning as SeverityBar:
 * sizing it bigger than TRACK_HEIGHT to show the full icon would otherwise
 * get it clipped by whichever adjacent segment renders on top of it.
 */
export function MoodBar({ score }: MoodBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const markerLeft =
    trackWidth > 0 ? (score - 0.5) * (trackWidth / STOPS.length) - MARKER_SIZE / 2 : 0;

  return (
    <View style={styles.row}>
      <Ionicons name="happy-outline" size={24} color={colors.textSecondary} />
      <View style={styles.track} onLayout={handleLayout}>
        <View style={styles.segments}>
          {STOPS.map((stop) => (
            <View key={stop} style={[styles.segment, { backgroundColor: severityScale[stop] }]} />
          ))}
        </View>

        {trackWidth > 0 ? (
          <Image
            source={require('../../assets/cactus-images/cactus-slider-icon.png')}
            style={[styles.marker, { left: markerLeft }]}
          />
        ) : null}
      </View>
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
  marker: {
    position: 'absolute',
    top: (TRACK_HEIGHT - MARKER_SIZE) / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  },
});
