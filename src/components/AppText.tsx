import { Text as NativeText, TextProps as NativeTextProps, StyleSheet } from 'react-native';

// defines props interface clearly
interface AppTextProps extends NativeTextProps {
  variant?: 'regular' | 'bold';
}

// pull out custom properties, rest are in "...rest"
export default function AppText({ variant = 'regular', style, children, ...rest }: AppTextProps) {
  return (
    <NativeText 
      style={[
        variant === 'bold' ? styles.textBold : styles.textRegular, 
        style
      ]}
      {...rest}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  textBold: {
    fontFamily: 'OpenSans-Bold',
  },
  textRegular: {
    fontFamily: 'OpenSans-Regular',
  },
});