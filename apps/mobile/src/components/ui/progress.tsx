import {
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native';

type ProgressProps = ViewProps & { value?: number; max?: number };

function Progress({ value = 0, max = 100, style, ...props }: ProgressProps) {
  const percentage = Math.max(0, Math.min(1, value / max));
  return (
    <View style={[styles.track, style]} {...props}>
      <View style={[styles.indicator, { width: `${percentage * 100}%` }]} />
    </View>
  );
}

function ProgressTrack({ style, ...props }: ViewProps) {
  return <View style={[styles.track, style]} {...props} />;
}

function ProgressIndicator({ style, ...props }: ViewProps) {
  return <View style={[styles.indicator, style]} {...props} />;
}

function ProgressLabel({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

function ProgressValue({ style, ...props }: TextProps) {
  return <Text style={[styles.value, style]} {...props} />;
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  indicator: { backgroundColor: '#1479F8', borderRadius: 999, height: '100%' },
  label: { color: '#17212B', fontSize: 14, fontWeight: '600' },
  value: { color: '#68737D', fontSize: 14, marginLeft: 'auto' },
});

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
};
