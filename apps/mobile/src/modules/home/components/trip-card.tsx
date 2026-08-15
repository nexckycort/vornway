import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { HomeTrip } from '../home.types';
import { homeCardStyles } from './home-card';

export function TripCard({ trip }: { trip: HomeTrip }) {
  const avatars = trip.members.slice(0, 3);
  return (
    <View style={[homeCardStyles.card, styles.card]}>
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
        <View style={styles.people}>
          {avatars.map((member) =>
            member.image ? (
              <Image
                key={member.id}
                source={member.image}
                style={styles.avatar}
              />
            ) : (
              <View
                key={member.id}
                style={[styles.avatar, styles.avatarFallback]}
              >
                <Text>{member.name.charAt(0)}</Text>
              </View>
            ),
          )}
          {trip.members.length > avatars.length ? (
            <Text style={styles.extra}>
              +{trip.members.length - avatars.length}
            </Text>
          ) : null}
        </View>
        {trip.balances.map((balance) => (
          <Text key={balance} numberOfLines={1} style={styles.balance}>
            {balance}
          </Text>
        ))}
      </View>
    </View>
  );
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
});
