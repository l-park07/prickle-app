import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyCactusMessage } from '../../components/DailyCactusMessage';
import { HomeHeader } from '../../components/HomeHeader';
import { LogFab } from '../../components/LogFab';
import { MonthCalendar } from '../../components/MonthCalendar';
import { NextAssessmentNotice } from '../../components/NextAssessmentNotice';
import { ProfileButton } from '../../components/ProfileButton';
import { colors, spacing } from '../theme';

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <HomeHeader />
        <MonthCalendar />
        <NextAssessmentNotice />
      </View>
      <View style={styles.spacer} />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xxl + spacing.sm }]}>
        <DailyCactusMessage />
      </View>
      <LogFab />
      <ProfileButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    gap: spacing.xl,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  bottom: {
    gap: spacing.lg,
  },
});
