import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

const CATEGORY_COLORS = [
  '#FF7FA3',
  '#5BD9CC',
  '#D978F4',
  '#FFA0A0',
  '#FFD741',
  '#62D9AA',
  '#9DAEF9',
  '#FFC06D',
] as const;
const CATEGORY_ICONS = [
  ['food', '🍴', 'Comida'],
  ['transport', '🚗', 'Transporte'],
  ['hotel', '🛏️', 'Alojamiento'],
  ['party', '🎉', 'Entretenimiento'],
  ['activities', '🌲', 'Actividades'],
  ['shopping', '🛍️', 'Compras'],
  ['travel', '✈️', 'Viaje'],
  ['work', '💼', 'Trabajo'],
  ['bank', '🏦', 'Banco'],
  ['gift', '🎁', 'Regalos'],
] as const;

export default function GroupCategoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#FF7FA3');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
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
  const categories =
    groupQuery.data && 'categories' in groupQuery.data
      ? groupQuery.data.categories
      : [];
  const createMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const response = await groupsClient[':id'].categories.$post({
        param: { id: id ?? '' },
        json: {
          name: categoryName,
          ...(icon.trim() ? { icon: icon.trim() } : {}),
          color,
        },
      });
      if (!response.ok) throw new Error('No se pudo crear la categoría');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      setName('');
      setIcon('');
      setColor('#FF7FA3');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await groupsClient[':id'].categories[
        ':categoryId'
      ].$delete({
        param: { id: id ?? '', categoryId },
      });
      if (!response.ok) throw new Error('No se pudo eliminar la categoría');
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]),
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId || !name.trim()) throw new Error('invalid');
      const response = await groupsClient[':id'].categories[
        ':categoryId'
      ].$patch({
        param: { id: id ?? '', categoryId: editingId },
        json: { name: name.trim(), icon: icon.trim() || null, color },
      });
      if (!response.ok) throw new Error('No se pudo actualizar la categoría');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      setEditingId(null);
      setName('');
      setIcon('');
      setColor('#FF7FA3');
    },
  });
  const moveMutation = useMutation({
    mutationFn: async (targetCategoryId: string | null) => {
      if (!movingId) throw new Error('invalid');
      const response = await groupsClient[':id'].categories[':categoryId'][
        'move-expenses'
      ].$post({
        param: { id: id ?? '', categoryId: movingId },
        json: { targetCategoryId },
      });
      if (!response.ok) throw new Error('No se pudieron mover los gastos');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      setMovingId(null);
    },
  });
  function add() {
    if (!id || !name.trim() || createMutation.isPending) return;
    createMutation.mutate(name.trim(), {
      onError: () => Alert.alert('No se pudo crear', 'Intenta nuevamente.'),
    });
  }
  return (
    <Screen>
      <ScreenHeader
        title="Categorías"
        onBack={() => router.replace(`/groups/${id}/settings` as never)}
      />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : groupQuery.isError ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>
            No pudimos cargar las categorías.
          </Text>
          <Button onPress={() => void groupQuery.refetch()}>
            <Text style={styles.editText}>Reintentar</Text>
          </Button>
        </Card>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.form}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Nueva categoría"
            />
            <Input
              value={icon}
              onChangeText={setIcon}
              placeholder="Ícono opcional (emoji)"
              maxLength={4}
            />
            <Text style={styles.label}>Ícono</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORY_ICONS.map(([value, emoji, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={icon === value ? 'default' : 'outline'}
                  onPress={() => setIcon(value)}
                >
                  <Text
                    style={icon === value ? styles.buttonText : styles.editText}
                  >
                    {emoji} {label}
                  </Text>
                </Button>
              ))}
            </ScrollView>
            <Text style={styles.label}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORY_COLORS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={color === value ? 'default' : 'outline'}
                  onPress={() => setColor(value)}
                  style={{
                    backgroundColor: color === value ? value : undefined,
                  }}
                >
                  <Text
                    style={
                      color === value ? styles.buttonText : styles.editText
                    }
                  >
                    {value}
                  </Text>
                </Button>
              ))}
            </ScrollView>
            <Button onPress={() => void add()}>
              <Text style={styles.buttonText}>Agregar categoría</Text>
            </Button>
          </Card>
          {categories.length === 0 ? (
            <Card style={styles.empty}>
              <Text style={styles.emptyText}>Aún no hay categorías.</Text>
            </Card>
          ) : null}
          {categories.map((category) => (
            <Card key={category.id} style={styles.item}>
              <Text style={styles.title}>
                {category.icon ? `${iconLabel(category.icon)} ` : ''}
                {category.name}
              </Text>
              <Button
                variant="outline"
                onPress={() => {
                  setEditingId(category.id);
                  setName(category.name);
                  setIcon(category.icon ?? '');
                  setColor(category.color ?? '#FF7FA3');
                }}
              >
                <Text style={styles.editText}>Editar</Text>
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onPress={() =>
                  Alert.alert(
                    'Eliminar categoría',
                    category.expenseCount
                      ? `Tiene ${category.expenseCount} gastos. Primero mueve esos gastos a otra categoría.`
                      : `¿Quieres eliminar ${category.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      ...(category.expenseCount
                        ? []
                        : [
                            {
                              text: 'Eliminar',
                              style: 'destructive' as const,
                              onPress: () => deleteMutation.mutate(category.id),
                            },
                          ]),
                    ],
                  )
                }
              >
                <Text style={styles.deleteText}>Eliminar</Text>
              </Button>
              {(category.expenseCount ?? 0) > 0 ? (
                <Button
                  variant="outline"
                  onPress={() => setMovingId(category.id)}
                >
                  <Text style={styles.editText}>Mover gastos</Text>
                </Button>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
      <Drawer
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar categoría</DrawerTitle>
          </DrawerHeader>
          <Input value={name} onChangeText={setName} placeholder="Nombre" />
          <Input
            value={icon}
            onChangeText={setIcon}
            placeholder="Ícono opcional"
            maxLength={4}
          />
          <Text style={styles.label}>Ícono</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORY_ICONS.map(([value, emoji, label]) => (
              <Button
                key={value}
                size="sm"
                variant={icon === value ? 'default' : 'outline'}
                onPress={() => setIcon(value)}
              >
                <Text
                  style={icon === value ? styles.buttonText : styles.editText}
                >
                  {emoji} {label}
                </Text>
              </Button>
            ))}
          </ScrollView>
          <Text style={styles.label}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORY_COLORS.map((value) => (
              <Button
                key={value}
                variant={color === value ? 'default' : 'outline'}
                onPress={() => setColor(value)}
              >
                <Text style={styles.buttonText}>{value}</Text>
              </Button>
            ))}
          </ScrollView>
          <DrawerFooter>
            <Button
              disabled={updateMutation.isPending}
              onPress={() =>
                updateMutation.mutate(undefined, {
                  onError: () =>
                    Alert.alert('No se pudo actualizar', 'Intenta nuevamente.'),
                })
              }
            >
              <Text style={styles.buttonText}>Guardar cambios</Text>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer
        open={movingId !== null}
        onOpenChange={(open) => {
          if (!open) setMovingId(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mover gastos</DrawerTitle>
          </DrawerHeader>
          <Button
            variant="outline"
            disabled={moveMutation.isPending}
            onPress={() => moveMutation.mutate(null)}
          >
            <Text style={styles.editText}>Dejar sin categoría</Text>
          </Button>
          {categories
            .filter((category) => category.id !== movingId)
            .map((category) => (
              <Button
                key={category.id}
                disabled={moveMutation.isPending}
                onPress={() => moveMutation.mutate(category.id)}
              >
                <Text style={styles.buttonText}>{category.name}</Text>
              </Button>
            ))}
        </DrawerContent>
      </Drawer>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  form: { gap: 12, padding: 16 },
  item: { padding: 16 },
  title: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  label: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  editText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  empty: { gap: 12, margin: 16, padding: 20 },
  emptyText: { color: '#64748B', fontSize: 14 },
});

function iconLabel(value: string) {
  return CATEGORY_ICONS.find(([id]) => id === value)?.[1] ?? value;
}
