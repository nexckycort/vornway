import { StyleSheet, Text, type TextProps } from 'react-native';

function Label({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

const styles = StyleSheet.create({
  label: { color: '#17212B', fontSize: 14, fontWeight: '600' },
});

export { Label };
