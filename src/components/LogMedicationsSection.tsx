import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';
import { LogCheckboxRow } from './LogCheckboxRow';
import { OptionDropdown } from './OptionDropdown';

const DELIVERY_METHODS = ['Topical', 'Oral', 'Injectable'];
const FREQUENCIES = [
  'Daily',
  '1 week on / 2 weeks off',
  'Monthly',
  '2 weeks on / 4 weeks off',
];

interface LogMedication {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

interface LogMedicationsSectionProps {
  medications: LogMedication[];
  onToggle: (id: string) => void;
  onAddMedication: (input: { name: string; deliveryMethod: string; frequency: string }) => void;
  onRemoveMedication: (id: string) => void;
}

/** Editable Medications checklist, plus an add-new flow (delivery method, name, frequency). */
export function LogMedicationsSection({
  medications,
  onToggle,
  onAddMedication,
  onRemoveMedication,
}: LogMedicationsSectionProps) {
  const [adding, setAdding] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null);
  const [customDelivery, setCustomDelivery] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [customFrequency, setCustomFrequency] = useState('');

  const confirmRemove = (medication: LogMedication) => {
    Alert.alert(
      'Remove this medication?',
      `"${medication.name}" will no longer appear in your daily log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveMedication(medication.id) },
      ]
    );
  };

  const resetAddFlow = () => {
    setAdding(false);
    setDeliveryMethod(null);
    setCustomDelivery('');
    setName('');
    setFrequency(null);
    setCustomFrequency('');
  };

  const handleAdd = () => {
    const finalName = name.trim();
    if (!finalName || !deliveryMethod || !frequency) return;
    onAddMedication({ name: finalName, deliveryMethod, frequency });
    resetAddFlow();
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Medications</AppText>

      {medications.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          No medications set up yet
        </AppText>
      ) : (
        medications.map((medication) => (
          <View key={medication.id} style={styles.row}>
            <View style={styles.checkboxWrap}>
              <LogCheckboxRow
                label={medication.name}
                checked={medication.checked}
                detail={medication.category}
                onToggle={() => onToggle(medication.id)}
              />
            </View>
            <Pressable
              onPress={() => confirmRemove(medication)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${medication.name}`}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addForm}>
          <OptionDropdown
            label="Delivery method"
            options={DELIVERY_METHODS}
            value={deliveryMethod}
            onChange={setDeliveryMethod}
            allowCustom
            customValue={customDelivery}
            onCustomChange={(text) => {
              setCustomDelivery(text);
              setDeliveryMethod(text);
            }}
          />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Hydrocortisone cream)"
            placeholderTextColor={colors.textSecondary}
          />
          <OptionDropdown
            label="Frequency"
            options={FREQUENCIES}
            value={frequency}
            onChange={setFrequency}
            allowCustom
            customValue={customFrequency}
            onCustomChange={(text) => {
              setCustomFrequency(text);
              setFrequency(text);
            }}
          />
          <View style={styles.addFormButtons}>
            <Pressable onPress={resetAddFlow} accessibilityRole="button">
              <AppText variant="label" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={handleAdd} accessibilityRole="button">
              <AppText variant="label" color={colors.primary}>
                Add
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add medication
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxWrap: {
    flex: 1,
  },
  addForm: {
    gap: spacing.sm,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
});
