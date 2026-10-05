import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from 'react-native';

type InputOTPProps = Omit<TextInputProps, 'maxLength'> & { maxLength?: number };

function InputOTP({
  maxLength = 6,
  value,
  onChangeText,
  style,
  ...props
}: InputOTPProps) {
  return (
    <TextInput
      keyboardType="number-pad"
      maxLength={maxLength}
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, style]}
      {...props}
    />
  );
}

function InputOTPGroup({ style, ...props }: ViewProps) {
  return <View style={[styles.group, style]} {...props} />;
}

function InputOTPSlot({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      maxLength={1}
      keyboardType="number-pad"
      style={[styles.slot, style]}
      {...props}
    />
  );
}

function InputOTPSeparator({ style, ...props }: ViewProps) {
  return <View style={[styles.separator, style]} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    height: 42,
    letterSpacing: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  group: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  slot: {
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    height: 42,
    textAlign: 'center',
    width: 42,
  },
  separator: { backgroundColor: '#94A3B8', height: 1, width: 8 },
});

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
