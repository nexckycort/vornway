import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import {
  cacheGroupExpenses,
  readCachedGroupExpenses,
} from '@/lib/group-expense-cache';

type ExpenseOption = {
  id: string;
  description: string;
  isSettlement?: boolean;
  isDeleted?: boolean;
};

type PinnedExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  isSettlement?: boolean;
  isDeleted?: boolean;
  date?: string;
};

import {
  getPendingExpenses,
  syncPendingExpenses,
} from '@/lib/offline-expense-queue';

import {
  GroupDetailHeader,
  type GroupDetailHeaderData,
} from './components/group-detail-header';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<string[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [showExpenseOptions, setShowExpenseOptions] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseOption | null>(
    null,
  );
  useEffect(() => {
    if (!id) return;
    void SecureStore.getItemAsync(`vornway:expense-pins:${id}`).then(
      (value) => {
        if (!value) return;
        try {
          const parsed = JSON.parse(value) as unknown;
          if (Array.isArray(parsed)) {
            setPinnedExpenseIds(
              parsed.filter((item): item is string => typeof item === 'string'),
            );
          }
        } catch {
          // Ignore malformed local pin state.
        }
      },
    );
  }, [id]);
  useEffect(() => {
    if (!id) return;
    void syncPendingExpenses().then(() => {
      void queryClient.invalidateQueries({ queryKey: ['group-expenses', id] });
      void queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      void queryClient.invalidateQueries({
        queryKey: ['offline-pending-expenses', id],
      });
    });
  }, [id, queryClient]);
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el espacio');
      return response.json();
    },
  });
  const expensesQuery = useInfiniteQuery({
    queryKey: ['group-expenses', id],
    initialPageParam: null as string | null,
    enabled: Boolean(id),
    queryFn: async ({ pageParam }) => {
      const response = await groupsClient[':id'].expenses.$get({
        param: { id: id ?? '' },
        query: {
          limit: '50',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      if (!response.ok) throw new Error('No se pudieron cargar los gastos');
      const page = await response.json();
      if ('data' in page && Array.isArray(page.data)) {
        try {
          await cacheGroupExpenses(id ?? '', page.data);
          queryClient.setQueryData(
            ['cached-group-expenses', id],
            (current: Array<{ id: string }> = []) => {
              const merged = new Map(
                current.map((expense) => [expense.id, expense]),
              );
              for (const expense of page.data) merged.set(expense.id, expense);
              return [...merged.values()];
            },
          );
        } catch {
          // Cache persistence is best effort and must not block the response.
        }
      }
      return page;
    },
    getNextPageParam: (lastPage) =>
      'pagination' in lastPage ? lastPage.pagination.nextCursor : undefined,
  });
  const pinnedExpenseQueries = useQueries({
    queries: pinnedExpenseIds.map((expenseId) => ({
      queryKey: ['group-expense', id, expenseId],
      enabled: Boolean(id && expenseId),
      queryFn: async (): Promise<PinnedExpense | null> => {
        const response = await groupsClient[':id'].expenses[':expenseId'].$get({
          param: { id: id ?? '', expenseId },
        });
        if (!response.ok) return null;
        const expense = (await response.json()) as PinnedExpense;
        return expense;
      },
    })),
  });
  const pendingExpensesQuery = useQuery({
    queryKey: ['offline-pending-expenses', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const pending = await getPendingExpenses();
      return pending.filter((item) => item.groupId === id);
    },
  });
  const cachedExpensesQuery = useQuery({
    queryKey: ['cached-group-expenses', id],
    enabled: Boolean(id),
    queryFn: () => readCachedGroupExpenses(id ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$delete(
        {
          param: { id: id ?? '', expenseId },
        },
      );
      if (!response.ok) throw new Error('expense_delete_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
      ]);
    },
  });
  const group =
    groupQuery.data && 'name' in groupQuery.data ? groupQuery.data : null;
  const expenses =
    expensesQuery.data?.pages.flatMap((page) =>
      'data' in page ? page.data : [],
    ) ?? [];
  const visibleExpenses =
    expenses.length > 0
      ? expenses
      : expensesQuery.isError
        ? (cachedExpensesQuery.data ?? [])
        : [];
  const pinnedExpenses = pinnedExpenseQueries.flatMap((query) =>
    query.data ? [query.data] : [],
  );
  const mergedExpenses = Array.from(
    new Map(
      [...visibleExpenses, ...pinnedExpenses].map((expense) => [
        expense.id,
        expense,
      ]),
    ).values(),
  );
  const orderedExpenses = mergedExpenses.sort(
    (left, right) =>
      Number(pinnedExpenseIds.includes(right.id)) -
      Number(pinnedExpenseIds.includes(left.id)),
  );
  const togglePin = (expenseId: string) => {
    if (!id) return;
    setPinnedExpenseIds((current) => {
      const next = current.includes(expenseId)
        ? current.filter((item) => item !== expenseId)
        : [...current, expenseId];
      void SecureStore.setItemAsync(
        `vornway:expense-pins:${id}`,
        JSON.stringify(next),
      );
      return next;
    });
  };
  return (
    <Screen>
      {group ? (
        <GroupDetailHeader
          group={group as GroupDetailHeaderData}
          onBack={() => router.back()}
          onOpenQr={() => setShowQr(true)}
          onCreateExpense={() =>
            router.push(`/groups/${id}/add-expense` as never)
          }
          onOpenReports={() => router.push(`/groups/${id}/reports` as never)}
          onOpenSettings={() => router.push(`/groups/${id}/settings` as never)}
          onOpenParticipants={() =>
            router.push(`/groups/${id}/participants` as never)
          }
          onSettle={() => router.push(`/groups/${id}/settle` as never)}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={groupQuery.isRefetching || expensesQuery.isRefetching}
            onRefresh={() => {
              void Promise.all([groupQuery.refetch(), expensesQuery.refetch()]);
            }}
            tintColor="#DE034D"
          />
        }
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            expensesQuery.hasNextPage &&
            !expensesQuery.isFetchingNextPage
          ) {
            void expensesQuery.fetchNextPage();
          }
        }}
      >
        {groupQuery.isLoading || expensesQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : groupQuery.isError ||
          (expensesQuery.isError && visibleExpenses.length === 0) ? (
          <Card style={styles.card}>
            <Text style={styles.title}>No se pudo cargar el espacio</Text>
            <Button
              onPress={() => {
                void groupQuery.refetch();
                void expensesQuery.refetch();
              }}
            >
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : null}
        {group ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.section}>Saldos</Text>
              {group.memberBalances.map((member) => (
                <Button
                  key={member.memberId}
                  variant="ghost"
                  onPress={() =>
                    router.push(
                      `/groups/${id}/member/${member.memberId}` as never,
                    )
                  }
                >
                  <Text style={styles.copy}>
                    {member.isCurrentUser ? 'Tu balance' : member.name}:{' '}
                    {Object.entries(member.balances).length === 0
                      ? 'Al día'
                      : Object.entries(member.balances)
                          .map(([currency, amount]) => {
                            if (amount === 0) return `${currency}: Al día`;
                            return `${amount > 0 ? 'Te deben' : 'Debes'} ${Math.abs(amount)} ${currency}`;
                          })
                          .join(' · ')}
                  </Text>
                </Button>
              ))}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Gastos recientes</Text>
              {pendingExpensesQuery.data?.map((pending) => (
                <View key={pending.id} style={styles.pendingExpense}>
                  <Text style={styles.copy}>
                    {String(pending.payload.description ?? 'Gasto pendiente')}
                  </Text>
                  <Text style={styles.pendingCopy}>
                    {String(pending.payload.amount ?? 0)}{' '}
                    {String(pending.payload.currency ?? '')} · Pendiente de
                    sincronización
                  </Text>
                </View>
              ))}
              {visibleExpenses.length === 0 ? (
                <Text style={styles.copy}>
                  {pendingExpensesQuery.data?.length
                    ? 'El resto de los gastos aparecerá al sincronizar.'
                    : 'Aún no hay gastos.'}
                </Text>
              ) : null}
              {orderedExpenses.map((expense) => (
                <View key={expense.id} style={styles.expenseRow}>
                  <Button
                    style={styles.expenseButton}
                    variant="ghost"
                    onPress={() =>
                      router.push(
                        `/groups/${id}/expense/${expense.id}` as never,
                      )
                    }
                  >
                    <Text style={styles.copy}>
                      {expense.description} · {expense.amount}{' '}
                      {expense.currency}
                    </Text>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setSelectedExpense(expense);
                      setShowExpenseOptions(true);
                    }}
                  >
                    <Text style={styles.pinText}>⋯</Text>
                  </Button>
                </View>
              ))}
              {expensesQuery.isFetchingNextPage ? (
                <Spinner color="#DE034D" />
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR de invitación</DialogTitle>
            <DialogDescription>
              Escanéalo para unirte a {group?.name ?? 'este espacio'}.
            </DialogDescription>
          </DialogHeader>
          {group?.inviteCode ? (
            <Image
              style={styles.qr}
              accessibilityLabel="Código QR de invitación"
              source={{
                uri: `https://quickchart.io/qr?size=420&text=${encodeURIComponent(
                  `https://join.vornway.com/${group.inviteCode}`,
                )}`,
              }}
              contentFit="contain"
            />
          ) : null}
          <Button
            variant="outline"
            disabled={!group?.inviteCode}
            onPress={() => {
              if (!group?.inviteCode) return;
              void Share.share({
                message: `Únete a ${group.name} en Vornway: https://join.vornway.com/${group.inviteCode}`,
              });
            }}
          >
            <Text style={styles.outlineText}>Compartir enlace</Text>
          </Button>
        </DialogContent>
      </Dialog>
      <Drawer
        open={showExpenseOptions}
        onOpenChange={(open) => {
          setShowExpenseOptions(open);
          if (!open) setSelectedExpense(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedExpense?.description ?? 'Opciones del gasto'}
            </DrawerTitle>
          </DrawerHeader>
          {selectedExpense ? (
            <View style={styles.optionsContent}>
              {!selectedExpense.isSettlement && !selectedExpense.isDeleted ? (
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowExpenseOptions(false);
                    router.push({
                      pathname: '/groups/[id]/add-expense',
                      params: { id, expenseId: selectedExpense.id },
                    } as never);
                  }}
                >
                  <Text style={styles.outlineText}>Editar gasto</Text>
                </Button>
              ) : null}
              {!selectedExpense.isSettlement && !selectedExpense.isDeleted ? (
                <Button
                  variant="outline"
                  onPress={() => {
                    togglePin(selectedExpense.id);
                    setShowExpenseOptions(false);
                  }}
                >
                  <Text style={styles.outlineText}>
                    {pinnedExpenseIds.includes(selectedExpense.id)
                      ? 'Desfijar gasto'
                      : 'Fijar gasto'}
                  </Text>
                </Button>
              ) : null}
              {!selectedExpense.isDeleted ? (
                <Button
                  variant="destructive"
                  disabled={deleteExpenseMutation.isPending}
                  onPress={() => {
                    setShowExpenseOptions(false);
                    Alert.alert(
                      selectedExpense.isSettlement
                        ? 'Eliminar liquidación'
                        : 'Eliminar gasto',
                      '¿Quieres eliminar este movimiento?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: () =>
                            deleteExpenseMutation.mutate(selectedExpense.id),
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.deleteText}>Eliminar</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 10, padding: 18 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  section: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  expenseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  expenseButton: { flex: 1, justifyContent: 'flex-start' },
  pinText: { color: '#DE034D', fontSize: 18 },
  optionsContent: { gap: 12, padding: 16 },
  deleteText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  pendingExpense: {
    borderColor: '#DE034D',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 3,
  },
  pendingCopy: { color: '#DE034D', fontSize: 12 },
  qr: { alignSelf: 'center', height: 280, width: 280 },
});
