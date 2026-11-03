import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useUsernameRequirement } from '../../username/use-username-requirement';

export default function InviteScreen() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { ensureUsername, usernameDialog } = useUsernameRequirement();
  const previewQuery = useQuery({
    ...api.invites.preview.queryOptions({ params: { inviteCode } }),
    enabled: Boolean(inviteCode),
  });
  const acceptMutation = useMutation({
    ...api.invites.accept.mutationOptions(),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: api.groups.key() }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      if (result.groupType === 'meta') {
        router.replace({
          pathname: '/goals/[id]',
          params: { id: result.groupId, from: 'goals' },
        } as never);
      } else router.replace(`/groups/${result.groupId}` as never);
    },
  });
  const openGroup = async (groupId: string, groupType?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: api.groups.key() }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
    if (groupType === 'meta') {
      router.replace({
        pathname: '/goals/[id]',
        params: { id: groupId, from: 'goals' },
      } as never);
    } else {
      router.replace(`/groups/${groupId}` as never);
    }
  };

  async function acceptInvite(memberId?: string) {
    if (!(await ensureUsername())) return;
    acceptMutation.mutate(
      { params: { inviteCode }, payload: memberId ? { memberId } : {} },
      {
        onError: () => Alert.alert(t('invite.acceptFailed'), t('common.retry')),
      },
    );
  }

  const preview = previewQuery.data;
  return (
    <Screen>
      <ScreenHeader
        title={t('invite.title')}
        onBack={() => router.replace('/groups' as never)}
      />
      {previewQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : previewQuery.isError ? (
        <Card style={styles.empty}>
          <Text style={styles.title}>{t('invite.loadFailed')}</Text>
          <Text style={styles.copy}>{t('common.retry')}</Text>
          <Button onPress={() => previewQuery.refetch()}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Button>
        </Card>
      ) : !preview?.group ? (
        <Card style={styles.empty}>
          <Text style={styles.title}>{t('invite.loadFailed')}</Text>
          <Text style={styles.copy}>{t('invite.newParticipantCopy')}</Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          {preview.group.imageUrl ? (
            <Image
              source={{ uri: preview.group.imageUrl }}
              style={styles.image}
            />
          ) : null}
          <Text style={styles.title}>
            {preview.alreadyMember
              ? t('invite.alreadyMember')
              : t('invite.welcome', { group: preview.group.name })}
          </Text>
          <Text style={styles.copy}>
            {preview.group.description || t('invite.newParticipantCopy')}
          </Text>
          {typeof preview.group.memberCount === 'number' ? (
            <Text style={styles.meta}>
              {preview.group.memberCount}{' '}
              {preview.group.memberCount === 1
                ? t('groups.reports.participants').slice(0, -1)
                : t('groups.reports.participants')}
            </Text>
          ) : null}
          {preview.alreadyMember ? (
            <Button
              onPress={() => {
                if (preview.group)
                  void openGroup(preview.group.id, preview.group.type);
              }}
            >
              <Text style={styles.buttonText}>{t('invite.goToGroup')}</Text>
            </Button>
          ) : (
            <>
              <Button
                disabled={acceptMutation.isPending}
                onPress={() => void acceptInvite()}
              >
                <Text style={styles.buttonText}>{t('invite.continueNew')}</Text>
              </Button>
              {preview.unregisteredMembers?.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  disabled={acceptMutation.isPending}
                  onPress={() => void acceptInvite(member.id)}
                >
                  <Text style={styles.outlineText}>
                    {t('invite.itsMe')} · {member.name}
                  </Text>
                </Button>
              ))}
            </>
          )}
        </Card>
      )}
      {usernameDialog}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  image: { borderRadius: 18, height: 160, width: '100%' },
  empty: { alignItems: 'center', gap: 8, margin: 16, padding: 24 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  meta: { color: '#64748B', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
