import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../app/theme';
import { AppText } from './AppText';
import { SeverityCell } from './SeverityCell';

interface CalendarLegendProps {
  visible: boolean;
  onClose: () => void;
}

const SWATCH_SIZE = 32;

const SEVERITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'barely there',
  2: 'mild',
  3: 'moderate',
  4: 'intense',
  5: 'severe',
};

/** Bottom sheet explaining what the calendar's colors/borders mean. */
export function CalendarLegend({ visible, onClose }: CalendarLegendProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <AppText variant="title">What the colors mean</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              Each day's color is the most affected site that day, not an average.
            </AppText>

            <View style={styles.rows}>
              {([1, 2, 3, 4, 5] as const).map((score) => (
                <View key={score} style={styles.row}>
                  <SeverityCell worst={score} style={styles.swatch} />
                  <AppText variant="body">
                    {score} — {SEVERITY_LABELS[score]}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.rows}>
              <View style={styles.row}>
                <SeverityCell worst={0} style={styles.swatch} />
                <AppText variant="body">Every site clear</AppText>
              </View>
              <View style={styles.row}>
                <SeverityCell worst={null} style={styles.swatch} />
                <AppText variant="body">Data logged, but scored no sites</AppText>
              </View>
              <View style={styles.row}>
                <SeverityCell worst={undefined} style={styles.swatch} />
                <AppText variant="body">No log that day — that's alright</AppText>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
