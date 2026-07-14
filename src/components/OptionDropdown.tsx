import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';
import { AppText } from './AppText';

const OTHER_LABEL = 'Other';

interface OptionDropdownProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Adds an "Other" row that reveals a free-text input in its place. */
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (text: string) => void;
}

/**
 * Closed-by-default picker: a tappable row showing the current selection,
 * expanding to a list of options styled like AssessmentOptionList's rows.
 * Backs delivery method, frequency, and trigger-category/trigger-name pickers.
 */
export function OptionDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  allowCustom,
  customValue,
  onCustomChange,
}: OptionDropdownProps) {
  const [expanded, setExpanded] = useState(false);
  const isCustomSelected = allowCustom && value !== null && !options.includes(value);

  const handleSelect = (option: string) => {
    if (option === OTHER_LABEL) {
      onChange('');
      onCustomChange?.('');
      setExpanded(false);
      return;
    }
    onChange(option);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.closedRow}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.closedTextColumn}>
          <AppText variant="label" color={colors.textSecondary}>
            {label}
          </AppText>
          <AppText variant="body">
            {isCustomSelected ? value || placeholder : value ?? placeholder}
          </AppText>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.list} accessibilityRole="radiogroup">
          {options.map((option) => {
            const isSelected = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => handleSelect(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={styles.row}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <AppText variant="body" color={isSelected ? colors.textPrimary : colors.textSecondary}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
          {allowCustom ? (
            <Pressable
              onPress={() => handleSelect(OTHER_LABEL)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isCustomSelected }}
              style={styles.row}
            >
              <Ionicons
                name={isCustomSelected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={isCustomSelected ? colors.primary : colors.textSecondary}
              />
              <AppText
                variant="body"
                color={isCustomSelected ? colors.textPrimary : colors.textSecondary}
              >
                {OTHER_LABEL}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isCustomSelected ? (
        <TextInput
          style={styles.customInput}
          value={customValue}
          onChangeText={(text) => {
            onCustomChange?.(text);
            onChange(text);
          }}
          placeholder="Type your own…"
          placeholderTextColor={colors.textSecondary}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closedTextColumn: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customInput: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
