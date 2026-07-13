import { StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import { AppText } from './AppText';
import { MoodBar } from './MoodBar';

interface TodayMoodSectionProps {
  mood: number | null;
}

/** Shown only when mood was tracked that day — unlike Sites/Triggers/Medications, there's no "not recorded" state to display. */
export function TodayMoodSection({ mood }: TodayMoodSectionProps) {
  if (mood === null) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title">Mood</AppText>
      <MoodBar score={mood} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
