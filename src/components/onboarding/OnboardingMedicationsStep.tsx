import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { DELIVERY_METHODS, FREQUENCIES } from '../../lib/medicationOptions';
import { AppText } from '../AppText';
import { OptionDropdown } from '../OptionDropdown';

export interface OnboardingMedication {
  id: string;
  name: string;
}

interface OnboardingMedicationsStepProps {
  medications: OnboardingMedication[];
  onAddMedication: (input: { name: string; deliveryMethod: string; frequency: string }) => void;
  onRemoveMedication: (id: string) => void;
}

/** Step 3 (0-indexed) — establishes the master medication list, same add-flow as the Log modal. */
export function OnboardingMedicationsStep({
  medications,
  onAddMedication,
  onRemoveMedication,
}: OnboardingMedicationsStepProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null);
  const [customDelivery, setCustomDelivery] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [customFrequency, setCustomFrequency] = useState('');

  const handleAdd = () => {
    const finalName = name.trim();
    if (!finalName || !deliveryMethod || !frequency) return;
    onAddMedication({ name: finalName, deliveryMethod, frequency });
    setDeliveryMethod(null);
    setCustomDelivery('');
    setName('');
    setFrequency(null);
    setCustomFrequency('');
  };

  return (
    <View style={styles.container}>
      <AppText variant="h2">Anything you use regularly?</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Creams, antihistamines, anything else — you can add more anytime.
      </AppText>

      {medications.length > 0 ? (
        <View style={styles.list}>
          {medications.map((medication) => (
            <View key={medication.id} style={styles.row}>
              <AppText variant="body" style={styles.rowLabel}>
                {medication.name}
              </AppText>
              <Pressable
                onPress={() => onRemoveMedication(medication.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${medication.name}`}
                hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

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
      {name.trim() && deliveryMethod && frequency ? (
        <Pressable onPress={handleAdd} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add medication
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
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
