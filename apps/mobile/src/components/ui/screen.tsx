import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './button';

function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.screen}>{children}</SafeAreaView>;
}

function ScreenHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Button variant="ghost" size="icon" onPress={onBack}>
          <Text style={styles.back}>‹</Text>
        </Button>
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <Text style={styles.title}>{title}</Text>
      {action ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FAFAFA', flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerSpacer: { height: 40, width: 40 },
  back: { color: '#202124', fontSize: 34, lineHeight: 34 },
  title: {
    color: '#0F172A',
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export { Screen, ScreenHeader };
