import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

function Field({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.field, style]} {...props}>
      {children}
    </View>
  );
}

function FieldLabel({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.label, style]} {...props}>
      {children}
    </View>
  );
}

function FieldDescription({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.description, style]} {...props}>
      {children}
    </View>
  );
}

function FieldError({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.error, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { gap: 4 },
  description: { opacity: 0.7 },
  error: { opacity: 0.9 },
});

export { Field, FieldDescription, FieldError, FieldLabel };
