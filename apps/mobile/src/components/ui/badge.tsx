import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';

type BadgeProps = TextProps & { variant?: BadgeVariant };

function badgeVariants({
  variant = 'default',
}: {
  variant?: BadgeVariant;
} = {}): StyleProp<TextStyle> {
  return [styles.badge, styles[variant]];
}

function Badge({ variant = 'default', style, ...props }: BadgeProps) {
  return <Text style={[badgeVariants({ variant }), style]} {...props} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  default: { backgroundColor: '#1F2937', color: '#FFFFFF' },
  secondary: { backgroundColor: '#F1F5F9', color: '#1F2937' },
  destructive: { backgroundColor: '#FEF2F2', color: '#B91C1C' },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#D1D5DB',
    color: '#1F2937',
  },
  ghost: { backgroundColor: 'transparent', color: '#1F2937' },
  link: {
    backgroundColor: 'transparent',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});

export { Badge, badgeVariants };
