import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

function InputGroup({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.group, style]} {...props}>
      {children}
    </View>
  );
}

function InputGroupAddon({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.addon, style]} {...props}>
      {children}
    </View>
  );
}

function InputGroupText({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.text, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  addon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  text: { alignItems: 'center', justifyContent: 'center' },
});

export { InputGroup, InputGroupAddon, InputGroupText };
