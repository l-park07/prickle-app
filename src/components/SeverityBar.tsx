import { StyleSheet, View } from 'react-native';
import { clearColor, colors, notRecordedColor, radius, severityScale, spacing } from '../app/theme';
import { AppText } from './AppText';

interface SeverityBarProps {
  /** 0 = clear, 1-5 = severity, null = not recorded that day. */
  score: number | null;
}

const STOPS = [1, 2, 3, 4, 5] as const;

/**
 * Read-only severity display, for the Today tab. Three states: not recorded
 * (ghosted track, dashed Clear pill), clear/0 (dimmed track, filled Clear
 * pill), scored 1-5 (colored track with a marker, outlined Clear pill).
 * See SeverityInput for the editable version used on the Log screen.
 */
export function SeverityBar({ score }: SeverityBarProps) {
  const isClear = score === 0;
  const isNotRecorded = score === null;

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

      <View style={styles.track}>
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
          >
            {!isNotRecorded && !isClear && score === stop ? (
              <View style={styles.marker}>
                <AppText variant="label" color={colors.textPrimary}>
                  {stop}
                </AppText>
              </View>
            ) : null}
          </View>
        ))}
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
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
