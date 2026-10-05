import { useState } from 'react';
import { Pressable, type PressableProps, StyleSheet, View } from 'react-native';

type SwitchProps = Omit<PressableProps, 'onPress' | 'style'> & {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
  style?: PressableProps['style'];
};

function Switch({
  value,
  defaultValue = false,
  onValueChange,
  disabled,
  style,
  ...props
}: SwitchProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const checked = value ?? internalValue;
  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={toggle}
      style={style}
      {...props}
    >
      <View
        style={[
          styles.track,
          checked && styles.checked,
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.thumb, checked && styles.thumbChecked]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    padding: 2,
    width: 42,
  },
  checked: { backgroundColor: '#1479F8' },
  thumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 20,
    width: 20,
  },
  thumbChecked: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.5 },
});

export { Switch };
