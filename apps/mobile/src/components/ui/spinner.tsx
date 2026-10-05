import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

function Spinner(props: ActivityIndicatorProps) {
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      color="#1479F8"
      {...props}
    />
  );
}

export { Spinner };
