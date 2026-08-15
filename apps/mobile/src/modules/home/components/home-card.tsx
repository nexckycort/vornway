import { Pressable, StyleSheet, Text, View } from 'react-native';

export function HomeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.viewAll}>Ver todo</Text>
      </View>
      {children}
    </View>
  );
}

export function ActionCard({
  title,
  icon,
  primary,
  onPress,
}: {
  title: string;
  icon: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
        {icon}
      </Text>
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>
        {title}
      </Text>
    </Pressable>
  );
}

export const homeCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});

const styles = StyleSheet.create({
  section: { marginTop: 28, gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#202124', fontSize: 18, fontWeight: '600' },
  viewAll: { color: '#777777', fontSize: 13 },
  action: {
    flex: 1,
    height: 118,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  actionPrimary: { backgroundColor: '#DE034D' },
  actionIcon: { color: '#DE034D', fontSize: 24, fontWeight: '600' },
  actionIconPrimary: { color: '#FFFFFF' },
  actionText: { color: '#242424', fontSize: 15, fontWeight: '600' },
  actionTextPrimary: { color: '#FFFFFF' },
  pressed: { opacity: 0.82 },
});
