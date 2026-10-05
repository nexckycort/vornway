import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

function Input({
  style,
  placeholderTextColor = '#94A3B8',
  ...props
}: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    height: 36,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export { Input };
