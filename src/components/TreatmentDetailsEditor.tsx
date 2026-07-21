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
}

const TYPE_OPTIONS: PillOption<TreatmentType>[] = [
  { value: 'rx', label: 'Prescription' },
  { value: 'otc', label: 'OTC' },
  { value: 'both', label: 'Rx or OTC' },
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
 * a row in LogTreatmentsSection. Every field commits the full current state
 * immediately on change (see updateTreatmentDetails) — never on mount, so a
 * treatment with nothing set stays untouched until the user interacts.
 */
export function TreatmentDetailsEditor({ treatment, onChange }: TreatmentDetailsEditorProps) {
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

  const commit = (overrides: Partial<TreatmentDetails>) => {
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
      ...overrides,
    });
  };

  const handleTypeChange = (value: TreatmentType) => {
    setType(value);
    commit({ type: value });
  };

  const handleMethodChange = (value: DeliveryMethod) => {
    setMethod(value);
    commit({ deliveryMethod: value });
  };

  const handlePrnChange = (value: boolean) => {
    setIsPrn(value);
    commit({ isPrn: value });
  };

  const handleCadenceEveryChange = (value: number) => {
    setCadenceEvery(value);
    commit({ cadenceEvery: value });
  };

  const handleCadenceUnitChange = (value: CadenceUnit) => {
    setCadenceUnit(value);
    commit({ cadenceUnit: value });
  };

  const handleActiveCountChange = (value: number) => {
    setActiveCount(value);
    commit({ activeCount: value, activeUnit });
  };

  const handleActiveUnitChange = (value: WindowUnit) => {
    setActiveUnit(value);
    const nextActiveCount = activeCount ?? 1;
    setActiveCount(nextActiveCount);
    commit({ activeUnit: value, activeCount: nextActiveCount });
  };

  const handleRestCountChange = (value: number) => {
    setRestCount(value);
    commit({ restCount: value, restUnit });
  };

  const handleRestUnitChange = (value: WindowUnit) => {
    setRestUnit(value);
    const nextRestCount = restCount ?? 1;
    setRestCount(nextRestCount);
    commit({ restUnit: value, restCount: nextRestCount });
  };

  const cycleLabel =
    activeCount && restCount
      ? `${activeCount} ${plural(activeCount, activeUnit)} on, ${restCount} ${plural(restCount, restUnit)} off`
      : 'Add an on/off cycle';

  const restEditable = activeCount !== null;

  return (
    <View style={styles.container}>
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
