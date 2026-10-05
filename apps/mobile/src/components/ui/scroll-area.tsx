import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';

function ScrollArea({ style, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      style={[styles.scrollArea, style]}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}

function ScrollBar({ style, ...props }: ViewProps) {
  return <View style={[styles.scrollBar, style]} {...props} />;
}

const styles = StyleSheet.create({
  scrollArea: { flexGrow: 0 },
  scrollBar: {
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 4,
    width: 48,
  },
});

export { ScrollArea, ScrollBar };
