import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AssessmentOption } from '../../content/assessments';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface AssessmentOptionListProps {
  options: AssessmentOption[];
  /** The selected option's score, or undefined when the question is left blank. */
  selected: number | undefined;
  onSelect: (score: number) => void;
}

/** Single-select list of one question's options. Blank (no selection) is a valid, persisted state. */
export function AssessmentOptionList({ options, selected, onSelect }: AssessmentOptionListProps) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = selected === option.score;
        return (
          <Pressable
            key={option.label}
            onPress={() => onSelect(option.score)}
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
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
