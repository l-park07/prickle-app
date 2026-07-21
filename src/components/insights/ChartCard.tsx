import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import { Card } from '../Card';

interface ChartCardProps {
  title: string;
  /** e.g. the POEM/RECAP "© University of Nottingham" line — rendered under the title when present. */
  attribution?: ReactNode;
  /**
   * Worded description of what the chart shows, matching the accessibility standard set by
   * CalendarDay's describeState() — charts are SVG and not natively screen-reader-friendly, so
   * this is real visible UI, not just an accessibilityLabel.
   */
  summary?: string;
  /** Shown instead of children when there's nothing to plot yet. */
  empty?: ReactNode;
  children?: ReactNode;
}

const DEFAULT_EMPTY_MESSAGE = "Nothing logged in this stretch yet — that's alright.";

/** Consistent bordered wrapper every Insights chart sits inside. */
export function ChartCard({ title, attribution, summary, empty, children }: ChartCardProps) {
  return (
    <Card style={styles.card}>
      <AppText variant="title">{title}</AppText>
      {attribution ? attribution : null}
      {summary ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {summary}
        </AppText>
      ) : null}
      {children ? (
        <View>{children}</View>
      ) : (
        <View style={styles.emptyState}>
          {empty ?? (
            <AppText variant="caption" color={colors.textSecondary}>
              {DEFAULT_EMPTY_MESSAGE}
            </AppText>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
