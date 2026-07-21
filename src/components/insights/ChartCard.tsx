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
  /** Sits opposite the title, e.g. ChartExportButton's save/share icon — every chart supplies its own, since each captures a different view. */
  headerRight?: ReactNode;
  children?: ReactNode;
}

const DEFAULT_EMPTY_MESSAGE = "Nothing logged in this stretch yet — that's alright.";

/** Consistent bordered wrapper every Insights chart sits inside. */
export function ChartCard({ title, attribution, summary, empty, headerRight, children }: ChartCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="title" style={styles.headerTitle}>
          {title}
        </AppText>
        {headerRight}
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
  },
  emptyState: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
