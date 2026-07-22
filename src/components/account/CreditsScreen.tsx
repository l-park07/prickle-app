import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CREDITS_FOOTER, CREDIT_SECTIONS, CreditEntry } from '../../../content/credits';
import { colors, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import { CollapsibleSection } from '../CollapsibleSection';

/**
 * Profile → About Prickle → Credits & licences.
 *
 * Everything rendered here is bundled at build time, so the screen works with
 * no connection. Links are a convenience, never the attribution itself — the
 * credit has to be readable offline for the Flaticon licence to be satisfied.
 */
export function CreditsScreen() {
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
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="body" color={colors.textSecondary}>
          Prickle was made with the work of a lot of other people. Here they are.
        </AppText>

        {CREDIT_SECTIONS.map((section) => (
          <CollapsibleSection key={section.id} title={section.title} blurb={section.blurb}>
            {section.entries.map(renderEntry)}
          </CollapsibleSection>
        ))}

        <Pressable
          onPress={() => open(CREDITS_FOOTER.webUrl)}
          accessibilityRole="link"
          accessibilityLabel={`${CREDITS_FOOTER.webLabel}. Opens in your browser.`}
          hitSlop={spacing.xs}
          style={styles.footer}
        >
          <AppText variant="body" color={colors.primary}>
            {CREDITS_FOOTER.webLabel}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    paddingTop: spacing.sm,
  },
});
