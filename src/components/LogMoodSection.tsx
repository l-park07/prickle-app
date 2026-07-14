import { StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import { AppText } from './AppText';
import { MoodInput } from './MoodInput';

interface LogMoodSectionProps {
  mood: number;
  onChange: (value: number) => void;
}

/** Editable Mood section — always a definite 1-5 value, no not-recorded state. */
export function LogMoodSection({ mood, onChange }: LogMoodSectionProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title">Mood</AppText>
      <MoodInput value={mood} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
