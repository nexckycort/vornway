import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';

type Member = {
  id: string;
  name: string;
  image?: string | null;
};

type Balance = {
  memberId: string;
  name: string;
  isCurrentUser?: boolean;
  balances: Record<string, number>;
};

export type GroupDetailHeaderData = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  inviteCode?: string | null;
  type?: string | null;
  participantCount?: number;
  members?: Member[];
  totals?: Record<string, number>;
  memberBalances?: Balance[];
};

type Props = {
  group: GroupDetailHeaderData;
  onBack: () => void;
  onOpenQr: () => void;
  onCreateExpense: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  onOpenParticipants: () => void;
  onSettle: () => void;
};

const currencyFlags: Record<string, string> = {
  COP: '🇨🇴',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  MXN: '🇲🇽',
  BRL: '🇧🇷',
};

function formatMoney(currency: string, amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function GroupDetailHeader({
  group,
  onBack,
  onOpenQr,
  onCreateExpense,
  onOpenReports,
  onOpenSettings,
  onOpenParticipants,
  onSettle,
}: Props) {
  const isPersonal = group.type === 'personal';
  const totals = group.totals ?? {};
  const balances = group.memberBalances ?? [];
  const currencies =
    Object.keys(totals).length > 0 ? Object.keys(totals) : ['COP'];
  const currentBalance = balances.find((member) => member.isCurrentUser);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Button
          accessibilityLabel="Volver"
          onPress={onBack}
          size="icon"
          variant="ghost"
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Button>
        {group.imageUrl ? (
          <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
        ) : null}
        <View style={styles.titleCopy}>
          <Text numberOfLines={1} style={styles.groupName}>
            {group.name}
          </Text>
          <Text numberOfLines={1} style={styles.description}>
            {group.description ? `· ${group.description}` : ''}
          </Text>
        </View>
        {!isPersonal ? (
          <Button
            accessibilityLabel="Código QR de invitación"
            onPress={onOpenQr}
            size="icon"
            variant="ghost"
            style={styles.iconButton}
          >
            <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
          </Button>
        ) : null}
      </View>

      <View style={styles.currencyRow}>
        {currencies.map((currency) => {
          const total = totals[currency] ?? 0;
          const balance = currentBalance?.balances[currency] ?? 0;
          return (
            <View key={currency} style={styles.totalCard}>
              <View style={styles.currencyLabel}>
                <Text style={styles.flag}>
                  {currencyFlags[currency] ?? '💱'}
                </Text>
                <Text style={styles.currency}>{currency}</Text>
              </View>
              <Text style={styles.totalLabel}>Total gastado</Text>
              <Text style={styles.total}>{formatMoney(currency, total)}</Text>
              {Math.abs(balance) >= 0.01 ? (
                <Text style={styles.balance}>
                  {balance > 0 ? 'Te deben' : 'Debes'}{' '}
                  {formatMoney(currency, balance)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <HeaderAction
          icon="add"
          label="Agregar gasto"
          onPress={onCreateExpense}
          primary
        />
        {!isPersonal ? (
          <HeaderAction
            icon="arrow-up-right-box"
            label="Liquidar"
            onPress={onSettle}
          />
        ) : null}
        <HeaderAction
          icon="bar-chart-outline"
          label="Reportes"
          onPress={onOpenReports}
        />
        <HeaderAction
          icon="ellipsis-horizontal"
          label="Más"
          onPress={onOpenSettings}
        />
      </View>

      {!isPersonal ? (
        <View style={styles.participantsSection}>
          <View style={styles.participantsTitleRow}>
            <Button
              variant="ghost"
              onPress={onOpenParticipants}
              style={styles.participantsButton}
            >
              <Text style={styles.participantsTitle}>Participantes</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </Button>
            <Text style={styles.memberCount}>
              {group.participantCount ?? 0} miembros
            </Text>
          </View>
          <View style={styles.membersRow}>
            <Button
              variant="ghost"
              onPress={onOpenParticipants}
              style={styles.memberItem}
            >
              <View style={styles.addMember}>
                <Ionicons name="add" size={18} color="#94A3B8" />
              </View>
              <Text style={styles.memberName}>Agregar</Text>
            </Button>
            {(group.members ?? []).slice(0, 6).map((member) => (
              <View key={member.id} style={styles.memberItem}>
                {member.image ? (
                  <Image source={{ uri: member.image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.initials}>{initials(member.name)}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={styles.memberName}>
                  {member.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: IoniconsIconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Button variant="ghost" onPress={onPress} style={styles.action}>
      <View style={[styles.actionIcon, primary && styles.primaryActionIcon]}>
        <Ionicons name={icon} size={19} color="#FFFFFF" />
      </View>
      <Text numberOfLines={1} style={styles.actionLabel}>
        {label}
      </Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#100B0C',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  groupImage: { borderRadius: 14, height: 44, width: 44 },
  titleCopy: { flex: 1, gap: 2 },
  groupName: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  description: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  currencyRow: { flexDirection: 'row', gap: 12 },
  totalCard: {
    backgroundColor: '#2C2226',
    borderRadius: 24,
    flex: 1,
    minHeight: 126,
    padding: 16,
  },
  currencyLabel: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  flag: { fontSize: 16 },
  currency: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 14 },
  total: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', marginTop: 3 },
  balance: { color: '#86EFAC', fontSize: 11, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 6 },
  action: { flex: 1, minWidth: 0, paddingHorizontal: 2 },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: '#2C2226',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  primaryActionIcon: { backgroundColor: '#DE034D' },
  actionLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  participantsSection: { gap: 8, marginTop: 2 },
  participantsTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantsButton: { gap: 2, paddingHorizontal: 0 },
  participantsTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  memberCount: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  membersRow: { flexDirection: 'row', gap: 10, overflow: 'hidden' },
  memberItem: { alignItems: 'center', minWidth: 54, paddingHorizontal: 0 },
  addMember: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: {
    borderColor: '#E5E7EB',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  initials: { color: '#132238', fontSize: 13, fontWeight: '600' },
  memberName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 3,
    maxWidth: 54,
  },
});
