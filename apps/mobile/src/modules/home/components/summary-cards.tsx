import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/lib/i18n';

import type { HomeDebt, HomeExpense, HomeGoal } from '../home.types';
import { homeCardStyles } from './home-card';

export function ExpenseCard({
  item,
  onPress,
}: {
  item: HomeExpense;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={[homeCardStyles.card, styles.expense]}>
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.title}>
            {item.description}
          </Text>
          <Text style={styles.amount}>{item.amount}</Text>
        </View>
        <Text style={styles.muted}>
          {item.quickSplitName} · {t('friendsExpenses.paidBy')} {item.paidBy}
        </Text>
        <Text style={styles.muted}>
          {item.participantCount} {t('groups.reports.participants')} ·{' '}
          {item.balance}
        </Text>
        <Text style={styles.muted}>{item.createdAtLabel}</Text>
      </Card>
    </Pressable>
  );
}

export function GoalCard({
  item,
  onPress,
}: {
  item: HomeGoal;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={homeCardStyles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.muted}>{item.groupName}</Text>
          </View>
          <Text
            style={[styles.goalIcon, item.tone === 'yellow' && styles.yellow]}
          >
            ◎
          </Text>
        </View>
        <Progress
          value={item.progress}
          style={[
            styles.progressTrack,
            item.tone === 'yellow' && styles.progressYellow,
          ]}
        />
        <Text style={styles.muted}>
          {item.saved} de {item.target}
        </Text>
      </Card>
    </Pressable>
  );
}

export function DebtCard({
  item,
  onPress,
}: {
  item: HomeDebt;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={[homeCardStyles.card, styles.expense]}>
        <View style={styles.row}>
          <Text style={styles.title}>{item.counterpartyName}</Text>
          <Text style={styles.amount}>{item.remaining}</Text>
        </View>
        <Text style={styles.muted}>
          {item.directionLabel} · {item.statusLabel}
        </Text>
        <Text style={styles.muted}>
          {t('home.updatedAt', { date: item.updatedAtLabel })}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  expense: { gap: 7 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: { color: '#202124', fontSize: 15, fontWeight: '600', flex: 1 },
  amount: { color: '#202124', fontSize: 14, fontWeight: '600' },
  muted: { color: '#626262', fontSize: 12 },
  goalIcon: { color: '#DE034D', fontSize: 28 },
  yellow: { color: '#e6a700' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressYellow: { backgroundColor: '#f2bf36' },
});
