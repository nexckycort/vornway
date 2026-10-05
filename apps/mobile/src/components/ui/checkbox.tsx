import { useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

type CheckboxProps = Omit<
  PressableProps,
  'accessibilityRole' | 'onPress' | 'style'
> & {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function Checkbox({
  value,
  defaultValue = false,
  onValueChange,
  color = '#168448',
  disabled,
  style,
  ...props
}: CheckboxProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const checked = value ?? uncontrolledValue;

  function toggle() {
    if (disabled) return;

    const nextValue = !checked;
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={8}
      onPress={toggle}
      style={style}
      {...props}
    >
      <View
        style={[
          styles.box,
          checked && { backgroundColor: color, borderColor: color },
          disabled && styles.disabled,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#89949B',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 14,
  },
  disabled: { opacity: 0.5 },
});

export { Checkbox };
