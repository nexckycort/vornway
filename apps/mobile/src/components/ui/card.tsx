import * as React from 'react';
import {
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native';

type CardSize = 'default' | 'sm';

const CardSizeContext = React.createContext<CardSize>('default');

function useCardSpacing() {
  const size = React.useContext(CardSizeContext);
  return size === 'sm' ? 12 : 16;
}

function Card({
  size = 'default',
  style,
  ...props
}: ViewProps & { size?: CardSize }) {
  const spacing = size === 'sm' ? styles.small : styles.default;

  return (
    <CardSizeContext.Provider value={size}>
      <View style={[styles.card, spacing, style]} {...props} />
    </CardSizeContext.Provider>
  );
}

function CardHeader({ style, ...props }: ViewProps) {
  const spacing = useCardSpacing();

  return (
    <View
      style={[styles.header, { paddingHorizontal: spacing }, style]}
      {...props}
    />
  );
}

function CardTitle({ style, ...props }: TextProps) {
  const isSmall = React.useContext(CardSizeContext) === 'sm';

  return (
    <Text
      style={[styles.title, isSmall && styles.smallTitle, style]}
      {...props}
    />
  );
}

function CardDescription({ style, ...props }: TextProps) {
  return <Text style={[styles.description, style]} {...props} />;
}

function CardAction({ style, ...props }: ViewProps) {
  return <View style={[styles.action, style]} {...props} />;
}

function CardContent({ style, ...props }: ViewProps) {
  const spacing = useCardSpacing();

  return <View style={[{ paddingHorizontal: spacing }, style]} {...props} />;
}

function CardFooter({ style, ...props }: ViewProps) {
  const spacing = useCardSpacing();

  return (
    <View
      style={[
        styles.footer,
        {
          marginBottom: -spacing,
          paddingHorizontal: spacing,
          paddingVertical: spacing,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
    gap: 16,
    overflow: 'hidden',
    paddingVertical: 16,
  },
  default: { gap: 16, paddingVertical: 16 },
  small: { gap: 12, paddingVertical: 12 },
  header: { flexDirection: 'column', gap: 4 },
  title: { color: '#17212B', fontSize: 16, fontWeight: '600', lineHeight: 21 },
  smallTitle: { fontSize: 14, lineHeight: 19 },
  description: { color: '#68737D', fontSize: 14, lineHeight: 20 },
  action: { alignSelf: 'flex-end', position: 'absolute', right: 0, top: 0 },
  footer: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderTopColor: '#E5E7EB',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
});

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
