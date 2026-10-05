import { StyleSheet, View, type ViewProps } from 'react-native';

function Skeleton({ style, ...props }: ViewProps) {
  return <View style={[styles.skeleton, style]} {...props} />;
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#E5E7EB', borderRadius: 12, minHeight: 16 },
});

export { Skeleton };
