import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

import type { HomeTrip } from '../home.types';
import { homeCardStyles } from './home-card';

export function TripCard({
  trip,
  onPress,
}: {
  trip: HomeTrip;
  onPress?: () => void;
}) {
  const avatars =
    trip.members.length <= 2
      ? trip.members
      : [trip.members[0], trip.members[trip.members.length - 1]];
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={[homeCardStyles.card, styles.card]}>
        <View style={styles.imageWrap}>
          {trip.imageUrl ? (
            <Image
              source={trip.imageUrl}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.imagePlaceholder}>✈</Text>
          )}
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.name}>
            {trip.name}
          </Text>
          <View style={styles.dateRow}>
            {trip.dates ? <Text style={styles.date}>{trip.dates}</Text> : null}
            {trip.isPersonal ? (
              <Text style={styles.personal}>Personal</Text>
            ) : null}
          </View>
          {!trip.isPersonal ? (
            <>
              <AvatarGroup style={styles.people}>
                {avatars.map((member) =>
                  member.image ? (
                    <Avatar key={member.id} size="sm">
                      <AvatarImage source={{ uri: member.image }} />
                    </Avatar>
                  ) : (
                    <Avatar key={member.id} size="sm">
                      <AvatarFallback>{toInitials(member.name)}</AvatarFallback>
                    </Avatar>
                  ),
                )}
                <AvatarGroupCount size="sm" style={styles.extra}>
                  +{Math.max(0, trip.members.length - avatars.length)}
                </AvatarGroupCount>
              </AvatarGroup>
              {trip.balanceItems && trip.balanceItems.length > 0 ? (
                <View style={styles.balanceBlock}>
                  {trip.balanceLabel ? (
                    <Text numberOfLines={1} style={styles.balanceLabel}>
                      {trip.balanceLabel}
                    </Text>
                  ) : null}
                  {trip.balanceItems.map((balance) => (
                    <Text
                      key={`${balance.person}-${balance.amount}`}
                      numberOfLines={1}
                      style={styles.balance}
                    >
                      <Text style={styles.balancePerson}>{balance.person}</Text>{' '}
                      {balance.amount}
                    </Text>
                  ))}
                  {trip.balanceOverflowLabel ? (
                    <Text style={styles.overflow}>
                      {trip.balanceOverflowLabel}
                    </Text>
                  ) : null}
                </View>
              ) : trip.emptyLabel ? (
                <Text numberOfLines={1} style={styles.emptyLabel}>
                  {trip.emptyLabel}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, minHeight: 112 },
  imageWrap: {
    width: 82,
    height: 82,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f8e1e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { fontSize: 28, color: '#DE034D' },
  content: { flex: 1, gap: 5 },
  name: { color: '#202124', fontSize: 16, fontWeight: '600' },
  date: { color: '#94A3B8', fontSize: 12 },
  dateRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  personal: {
    backgroundColor: '#FFF1F5',
    borderRadius: 999,
    color: '#DE034D',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  people: { flexDirection: 'row', alignItems: 'center', height: 24 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: -5,
  },
  avatarFallback: {
    backgroundColor: '#f2d5df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extra: { color: '#777777', fontSize: 12, marginLeft: 9 },
  balance: { color: '#626262', fontSize: 12 },
  balanceBlock: { gap: 4, marginTop: 4 },
  balanceLabel: { color: '#047857', fontSize: 14, fontWeight: '600' },
  balancePerson: { color: '#4C4C4C' },
  overflow: { color: '#64748B', fontSize: 12 },
  emptyLabel: {
    color: '#202124',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
