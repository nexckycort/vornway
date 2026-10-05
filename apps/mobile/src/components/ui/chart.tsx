import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

type ChartConfig = Record<string, { label?: string; color?: string }>;
function ChartContainer({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps> & { config?: ChartConfig }) {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
}
function ChartStyle() {
  return null;
}
function ChartTooltip(props: ViewProps) {
  return <View {...props} />;
}
function ChartTooltipContent({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.tooltip, style]} {...props}>
      {children}
    </View>
  );
}
function ChartLegend(props: ViewProps) {
  return <View {...props} />;
}
function ChartLegendContent({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.legend, style]} {...props}>
      {children ?? <Text style={styles.muted}>Leyenda</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { minHeight: 180, width: '100%' },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
    padding: 8,
  },
  legend: { flexDirection: 'row', gap: 8, marginTop: 8 },
  muted: { color: '#68737D', fontSize: 12 },
});

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
