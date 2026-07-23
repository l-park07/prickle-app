import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../../app/theme';
import type { CustomChart } from '../../lib/manageCustomCharts';
import { AppText } from '../AppText';
import { LogCheckboxRow } from '../LogCheckboxRow';
import { PrimaryButton } from '../PrimaryButton';

const PERMANENT_TITLES = ['Severity over time', 'POEM', 'RECAP'];

interface ExportReviewSheetProps {
  visible: boolean;
  customCharts: CustomChart[];
  onClose: () => void;
  /** The set of custom chart ids to include, for this export only — never persisted back to
   *  each chart's own includeInExport flag. */
  onContinue: (includedChartIds: Set<string>) => void;
}

/**
 * "What's included" — shown before either export button actually runs. Permanent charts are
 * always-on and not toggleable here; each custom chart is pre-checked from its own
 * includeInExport flag but can be adjusted for THIS export only (toggling here never writes
 * back to the chart's stored default — see ChartConfigSheet/OverlayCard for that).
 */
export function ExportReviewSheet({ visible, customCharts, onClose, onContinue }: ExportReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());

  // Reset to the persisted defaults every time the sheet opens — this is a per-export review,
  // not a place ad-hoc choices should linger into the next export.
  useEffect(() => {
    if (visible) {
      setIncludedIds(new Set(customCharts.filter((c) => c.includeInExport).map((c) => c.id)));
    }
  }, [visible, customCharts]);

  const toggle = (chartId: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chartId)) next.delete(chartId);
      else next.add(chartId);
      return next;
    });
  };

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
            <View style={styles.header}>
              <AppText variant="h2" style={styles.headerText}>
                What&apos;s included
              </AppText>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.section}>
              {PERMANENT_TITLES.map((title) => (
                <View key={title} style={styles.permanentRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.textSecondary} />
                  <AppText variant="body" color={colors.textPrimary}>
                    {title}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} style={styles.alwaysLabel}>
                    Always included
                  </AppText>
                </View>
              ))}
            </View>

            {customCharts.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="label" color={colors.textSecondary}>
                  Your charts
                </AppText>
                {customCharts.map((chart) => (
                  <LogCheckboxRow
                    key={chart.id}
                    label={chart.title}
                    checked={includedIds.has(chart.id)}
                    onToggle={() => toggle(chart.id)}
                  />
                ))}
                <AppText variant="caption" color={colors.textSecondary}>
                  Your own charts are left out by default — exports are usually for an
                  appointment.
                </AppText>
              </View>
            ) : null}

            <PrimaryButton label="Continue" onPress={() => onContinue(includedIds)} />
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
    maxHeight: '85%',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
  },
  permanentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alwaysLabel: {
    marginLeft: 'auto',
  },
});
