import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

function Textarea({ style, multiline = true, ...props }: TextInputProps) {
  return (
    <TextInput
      multiline={multiline}
      textAlignVertical="top"
      style={[styles.textarea, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  textarea: {
    borderColor: '#D1D5DB',
    borderRadius: 12,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 96,
    padding: 12,
  },
});

export { Textarea };
