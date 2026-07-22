import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AI_DISCLOSURE,
  CREDITS_FOOTER,
  CREDIT_SECTIONS,
  CreditEntry,
  THANKS,
} from '../../../../content/credits';
import { AppText } from '../../../components/AppText';
import { colors, spacing } from '../../theme';

/**
 * Profile → Credits.
 *
 * Everything rendered here is bundled at build time, so the screen works with
 * no connection. Links are a convenience, never the attribution itself — the
 * credit has to be readable offline for the Flaticon licence to be satisfied.
 */
export default function Credits() {
  const open = (url: string) => {
    Linking.openURL(url).catch(() => {
      /* No browser, no crash — the text above the link still carries the credit. */
    });
  };

  const renderEntry = (entry: CreditEntry, i: number) =>
    entry.url ? (
      <Pressable
        key={i}
        onPress={() => open(entry.url as string)}
        accessibilityRole="link"
        accessibilityLabel={`${entry.text}. Opens in your browser.`}
        hitSlop={spacing.xs}
      >
        <AppText variant="body" color={colors.primary}>
          {entry.text}
        </AppText>
      </Pressable>
    ) : (
      <AppText key={i} variant="body" color={colors.textSecondary}>
        {entry.text}
      </AppText>
    );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText variant="body" color={colors.textSecondary}>
        Prickle was made with the work of a lot of other people. Here they are.
      </AppText>

      {CREDIT_SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          <AppText variant="title">{section.title}</AppText>
          {section.blurb ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {section.blurb}
            </AppText>
          ) : null}
          <View style={styles.entries}>{section.entries.map(renderEntry)}</View>
        </View>
      ))}

      <View style={styles.section}>
        <AppText variant="title">{AI_DISCLOSURE.title}</AppText>
        <View style={styles.entries}>
          {AI_DISCLOSURE.body.map((paragraph, i) => (
            <AppText key={i} variant="body" color={colors.textSecondary}>
              {paragraph}
            </AppText>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="title">{THANKS.title}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {THANKS.blurb}
        </AppText>
        <View style={styles.entries}>
          {THANKS.people.map((person) => (
            <AppText key={person} variant="body" color={colors.textSecondary}>
              {person}
            </AppText>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => open(CREDITS_FOOTER.webUrl)}
          accessibilityRole="link"
          accessibilityLabel={`${CREDITS_FOOTER.webLabel}. Opens in your browser.`}
          hitSlop={spacing.xs}
        >
          <AppText variant="body" color={colors.primary}>
            {CREDITS_FOOTER.webLabel}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  section: {
    gap: spacing.sm,
  },
  entries: {
    gap: spacing.sm,
  },
});
