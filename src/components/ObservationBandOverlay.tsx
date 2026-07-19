import { StyleSheet, View } from 'react-native';
import { observationBands } from '../app/theme';
import type { ObservationBand } from '../lib/calendarMath';

interface ObservationBandOverlayProps {
  bands: ObservationBand[];
}

const MAX_VISIBLE_BANDS = 3;
const BAND_HEIGHT = 3;
const BAND_GAP = 2;
const BAND_INSET = 4;

/**
 * Thin stacked bars along a calendar day cell's bottom edge, marking active
 * trigger-observation windows covering that date. Absolutely positioned so it
 * never affects the cell's layout size, and painted before the date numeral
 * (see CalendarDay) so the numeral stays on top if they ever overlap.
 */
export function ObservationBandOverlay({ bands }: ObservationBandOverlayProps) {
  const visible = bands.slice(0, MAX_VISIBLE_BANDS);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {visible.map((band, i) => (
        <View
          key={band.id}
          style={[
            styles.bar,
            {
              backgroundColor: observationBands[band.colorIndex % observationBands.length],
              bottom: BAND_INSET + i * (BAND_HEIGHT + BAND_GAP),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: BAND_INSET,
    right: BAND_INSET,
    height: BAND_HEIGHT,
    borderRadius: BAND_HEIGHT / 2,
  },
});
