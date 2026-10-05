import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export function HomeSection({
  title,
  children,
  onViewAll,
}: {
  title: string;
  children: React.ReactNode;
  onViewAll?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onViewAll ? (
          <Button variant="ghost" size="sm" onPress={onViewAll}>
            <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
          </Button>
        ) : null}
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
  icon: IoniconsIconName;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      onPress={onPress}
      style={[styles.action, primary && styles.actionPrimary]}
    >
      <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
        <Ionicons
          name={icon}
          size={21}
          color={primary ? '#DE034D' : '#DE034D'}
        />
      </View>
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>
        {title}
      </Text>
    </Button>
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
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
  },
  actionIconPrimary: { backgroundColor: '#FFFFFF' },
  actionText: { color: '#242424', fontSize: 15, fontWeight: '600' },
  actionTextPrimary: { color: '#FFFFFF' },
  pressed: { opacity: 0.82 },
});
