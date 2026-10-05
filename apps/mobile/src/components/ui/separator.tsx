import { StyleSheet, View, type ViewProps } from 'react-native';

type SeparatorProps = ViewProps & { orientation?: 'horizontal' | 'vertical' };

function Separator({
  orientation = 'horizontal',
  style,
  ...props
}: SeparatorProps) {
  return (
    <View
      accessibilityRole="none"
      style={[
        styles.separator,
        orientation === 'vertical' ? styles.vertical : styles.horizontal,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  separator: { backgroundColor: '#E5E7EB', flexShrink: 0 },
  horizontal: { height: StyleSheet.hairlineWidth, width: '100%' },
  vertical: { height: '100%', width: StyleSheet.hairlineWidth },
});

export { Separator };
