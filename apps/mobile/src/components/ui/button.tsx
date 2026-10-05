import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'link';

type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function buttonVariants({
  variant = 'default',
  size = 'default',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} = {}): StyleProp<ViewStyle> {
  return [styles.button, variantStyles[variant], sizeStyles[size]];
}

function Button({
  variant = 'default',
  size = 'default',
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state: PressableStateCallbackType) => [
        buttonVariants({ variant, size }),
        typeof style === 'function' ? style(state) : style,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  default: { backgroundColor: '#1479F8' },
  outline: { backgroundColor: 'transparent', borderColor: '#D1D5DB' },
  secondary: { backgroundColor: '#F1F5F9' },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  destructive: { backgroundColor: '#FEF2F2' },
  link: { backgroundColor: 'transparent', borderColor: 'transparent' },
  sizeDefault: { minHeight: 32 },
  sizeXs: { minHeight: 24, paddingHorizontal: 8 },
  sizeSm: { minHeight: 28, paddingHorizontal: 10 },
  sizeLg: { minHeight: 36, paddingHorizontal: 10 },
  sizeIcon: { height: 32, paddingHorizontal: 0, width: 32 },
  sizeIconXs: { height: 24, paddingHorizontal: 0, width: 24 },
  sizeIconSm: { height: 28, paddingHorizontal: 0, width: 28 },
  sizeIconLg: { height: 36, paddingHorizontal: 0, width: 36 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});

const variantStyles = {
  default: styles.default,
  outline: styles.outline,
  secondary: styles.secondary,
  ghost: styles.ghost,
  destructive: styles.destructive,
  link: styles.link,
} satisfies Record<ButtonVariant, ViewStyle>;

const sizeStyles = {
  default: styles.sizeDefault,
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  lg: styles.sizeLg,
  icon: styles.sizeIcon,
  'icon-xs': styles.sizeIconXs,
  'icon-sm': styles.sizeIconSm,
  'icon-lg': styles.sizeIconLg,
} satisfies Record<ButtonSize, ViewStyle>;

export { Button, buttonVariants };
