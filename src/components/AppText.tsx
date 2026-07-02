import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { colors, typography, TypographyVariant } from '../app/theme';

interface AppTextProps extends TextProps {
  /** Type scale variant. Defaults to 'body'. */
  variant?: TypographyVariant;
  /** Override the text color (defaults to theme textPrimary). */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * The single text primitive for Prickle.
 * Every bit of text in the app should go through this so Open Sans + the type
 * scale are applied consistently. No more hardcoding fontFamily per-screen.
 *
 * Usage:
 *   <AppText variant="h1">Good morning</AppText>
 *   <AppText variant="caption" color={colors.textSecondary}>Logged 2h ago</AppText>
 */
export function AppText({
  variant = 'body',
  color = colors.textPrimary,
  style,
  ...rest
}: AppTextProps) {
  return <Text style={[typography[variant], { color }, style]} {...rest} />;
}