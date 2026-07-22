import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../../app/theme';
import type { CustomChart } from '../../lib/manageCustomCharts';
import { AppText } from '../AppText';

interface ChartOptionsSheetProps {
  /** null = closed. */
  chart: CustomChart | null;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

interface RowProps {
  icon: IoniconsIconName;
  label: string;
  color?: string;
  onPress: () => void;
}

function Row({ icon, label, color = colors.textPrimary, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={color} />
      <AppText variant="body" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** A custom chart card's "..." menu — same Modal/backdrop/sheet shape as every other sheet in the
 *  app (TriggerDetailModal.tsx, ChartConfigSheet.tsx), reused here rather than inventing a second
 *  menu idiom. Each action closes the sheet after running. */
export function ChartOptionsSheet({ chart, isFirst, isLast, onClose, onEdit, onDuplicate, onMoveUp, onMoveDown, onDelete }: ChartOptionsSheetProps) {
  const insets = useSafeAreaInsets();

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <Modal visible={chart !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {chart ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <AppText variant="title" style={styles.title}>
              {chart.title}
            </AppText>
            <Row icon="create-outline" label="Edit" onPress={run(onEdit)} />
            <Row icon="copy-outline" label="Duplicate" onPress={run(onDuplicate)} />
            {!isFirst ? <Row icon="arrow-up-outline" label="Move up" onPress={run(onMoveUp)} /> : null}
            {!isLast ? <Row icon="arrow-down-outline" label="Move down" onPress={run(onMoveDown)} /> : null}
            <View style={styles.divider} />
            <Row icon="trash-outline" label="Delete" color={colors.error} onPress={run(onDelete)} />
          </View>
        ) : null}
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
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.xs,
  },
});
