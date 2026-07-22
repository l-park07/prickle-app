import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import type { CadenceUnit, DeliveryMethod, TreatmentType, WindowUnit } from '../../content/treatmentLibrary';
import type { DayEntryMedication } from '../lib/chartSelectors';
import type { TreatmentDetails } from '../lib/manageTreatments';
import { AppText } from './AppText';
import { NumberStepper } from './NumberStepper';
import { PillSelect, type PillOption } from './PillSelect';

interface TreatmentDetailsEditorProps {
  treatment: DayEntryMedication;
  onChange: (details: TreatmentDetails) => void;
  onClose: () => void;
}

const TYPE_OPTIONS: PillOption<TreatmentType>[] = [
  { value: 'rx', label: 'Prescription' },
  { value: 'otc', label: 'OTC' },
  { value: 'therapy', label: 'Therapy' },
];

const METHOD_OPTIONS: PillOption<DeliveryMethod>[] = [
  { value: 'topical', label: 'Topical' },
  { value: 'oral', label: 'Oral' },
  { value: 'injectable', label: 'Injectable' },
  { value: 'phototherapy', label: 'Phototherapy' },
  { value: 'bath', label: 'Bath' },
  { value: 'other', label: 'Other' },
];

const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;

const cadenceUnitOptions = (count: number): PillOption<CadenceUnit>[] => [
  { value: 'day', label: plural(count, 'Day') },
  { value: 'week', label: plural(count, 'Week') },
  { value: 'month', label: plural(count, 'Month') },
];

const windowUnitOptions = (count: number): PillOption<WindowUnit>[] => [
  { value: 'day', label: plural(count, 'Day') },
  { value: 'week', label: plural(count, 'Week') },
];

/**
 * Type/method/schedule editor for one treatment — the "Add details" panel for
 * a row in LogTreatmentsSection. Fields only live in local state until Save
 * commits the full draft at once (see updateTreatmentDetails); Cancel/the X
 * just close without ever calling onChange, so nothing is written to the DB
 * until the user explicitly saves.
 */
export function TreatmentDetailsEditor({ treatment, onChange, onClose }: TreatmentDetailsEditorProps) {
  const [type, setType] = useState(treatment.type);
  const [method, setMethod] = useState(treatment.deliveryMethod);
  const [isPrn, setIsPrn] = useState(treatment.isPrn);
  const [cadenceEvery, setCadenceEvery] = useState(treatment.cadenceEvery ?? 1);
  const [cadenceUnit, setCadenceUnit] = useState<CadenceUnit>(treatment.cadenceUnit ?? 'day');
  const [activeCount, setActiveCount] = useState(treatment.activeCount);
  const [activeUnit, setActiveUnit] = useState<WindowUnit>(treatment.activeUnit ?? 'day');
  const [restCount, setRestCount] = useState(treatment.restCount);
  const [restUnit, setRestUnit] = useState<WindowUnit>(treatment.restUnit ?? 'day');
  // Starts open for library picks where an on/off cycle is clinically relevant. In
  // content/treatmentLibrary.ts, suggestCycle:true rows are exactly the isSteroid:true rows
  // (TCS + oral prednisone), so this needs no separate stored flag. useState only reads this
  // once, so a manual collapse afterward isn't fought by re-renders.
  const [cycleExpanded, setCycleExpanded] = useState(treatment.isSteroid === true);

  const handleTypeChange = (value: TreatmentType) => {
    setType(value);
  };

  const handleMethodChange = (value: DeliveryMethod) => {
    setMethod(value);
  };

  const handlePrnChange = (value: boolean) => {
    setIsPrn(value);
  };

  const handleCadenceEveryChange = (value: number) => {
    setCadenceEvery(value);
  };

  const handleCadenceUnitChange = (value: CadenceUnit) => {
    setCadenceUnit(value);
  };

  const handleActiveCountChange = (value: number) => {
    setActiveCount(value);
  };

  const handleActiveUnitChange = (value: WindowUnit) => {
    setActiveUnit(value);
    setActiveCount((prev) => prev ?? 1);
  };

  const handleRestCountChange = (value: number) => {
    setRestCount(value);
  };

  const handleRestUnitChange = (value: WindowUnit) => {
    setRestUnit(value);
    setRestCount((prev) => prev ?? 1);
  };

  const handleSave = () => {
    onChange({
      type,
      deliveryMethod: method,
      cadenceEvery,
      cadenceUnit,
      isPrn,
      activeCount,
      activeUnit,
      restCount,
      restUnit,
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const cycleLabel =
    activeCount && restCount
      ? `${activeCount} ${plural(activeCount, activeUnit)} on, ${restCount} ${plural(restCount, restUnit)} off`
      : 'Add an on/off cycle';

  const restEditable = activeCount !== null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="label" color={colors.textSecondary}>
          Details
        </AppText>
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Close without saving"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <AppText variant="label" color={colors.textSecondary}>
          Type
        </AppText>
        <PillSelect options={TYPE_OPTIONS} value={type} onChange={handleTypeChange} accessibilityLabel="Type" />
      </View>

      <View style={styles.field}>
        <AppText variant="label" color={colors.textSecondary}>
          Method
        </AppText>
        <PillSelect
          options={METHOD_OPTIONS}
          value={method}
          onChange={handleMethodChange}
          accessibilityLabel="Method"
        />
      </View>

      <View style={styles.toggleRow}>
        <AppText variant="label" color={colors.textSecondary}>
          As needed instead
        </AppText>
        <Switch
          value={isPrn}
          onValueChange={handlePrnChange}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      {!isPrn ? (
        <View style={styles.field}>
          <AppText variant="label" color={colors.textSecondary}>
            How often
          </AppText>
          <View style={styles.cadenceRow}>
            <AppText variant="body">Every</AppText>
            <NumberStepper
              value={cadenceEvery}
              onChange={handleCadenceEveryChange}
              accessibilityLabel="cadence"
            />
            <PillSelect
              options={cadenceUnitOptions(cadenceEvery)}
              value={cadenceUnit}
              onChange={handleCadenceUnitChange}
              accessibilityLabel="Cadence unit"
            />
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => setCycleExpanded((e) => !e)}
        style={styles.disclosureRow}
        accessibilityRole="button"
      >
        <AppText variant="label" color={colors.primary}>
          {cycleLabel}
        </AppText>
        <Ionicons name={cycleExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
      </Pressable>

      {cycleExpanded ? (
        <View style={styles.field}>
          <AppText variant="label" color={colors.textSecondary}>
            Use for up to
          </AppText>
          <View style={styles.cadenceRow}>
            <NumberStepper
              value={activeCount ?? 1}
              onChange={handleActiveCountChange}
              accessibilityLabel="active window length"
            />
            <PillSelect
              options={windowUnitOptions(activeCount ?? 1)}
              value={activeUnit}
              onChange={handleActiveUnitChange}
              accessibilityLabel="Active window unit"
            />
          </View>

          <AppText variant="label" color={colors.textSecondary}>
            Then rest for
          </AppText>
          <View
            style={[styles.cadenceRow, !restEditable && styles.disabled]}
            pointerEvents={restEditable ? 'auto' : 'none'}
          >
            <NumberStepper
              value={restCount ?? 1}
              onChange={handleRestCountChange}
              accessibilityLabel="rest window length"
            />
            <PillSelect
              options={windowUnitOptions(restCount ?? 1)}
              value={restUnit}
              onChange={handleRestUnitChange}
              accessibilityLabel="Rest window unit"
            />
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable onPress={handleCancel} accessibilityRole="button">
          <AppText variant="label" color={colors.textSecondary}>
            Cancel
          </AppText>
        </Pressable>
        <Pressable onPress={handleSave} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            Save
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  field: {
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cadenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
