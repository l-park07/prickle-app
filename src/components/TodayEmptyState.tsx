import { StyleSheet } from 'react-native';
import { spacing } from '../app/theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

interface TodayEmptyStateProps {
  onLogNow: () => void;
}

/** Shown when no log exists at all for the viewed date. */
export function TodayEmptyState({ onLogNow }: TodayEmptyStateProps) {
  return (
    <Card style={styles.card}>
      <AppText variant="body">No data recorded today, log now!</AppText>
      <PrimaryButton label="Log Now" onPress={onLogNow} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
