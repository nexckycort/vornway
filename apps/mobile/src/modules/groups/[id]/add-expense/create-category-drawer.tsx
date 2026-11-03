import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const ICONS = ['🍽️', '🚗', '🏨', '🎟️', '🛍️', '💸'];
const COLORS = ['#14B8A6', '#F43F5E', '#F59E0B', '#3B82F6', '#8B5CF6'];

type Props = {
  groupId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (categoryId: string) => void;
};

export function CreateCategoryDrawer({
  groupId,
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍽️');
  const [color, setColor] = useState('#14B8A6');
  const mutation = useMutation({
    mutationFn: () => {
      if (!groupId || !name.trim()) throw new Error('category_name_required');
      return api.groups.createCategory.request({
        params: { id: groupId },
        payload: { name: name.trim(), icon, color },
      });
    },
    onSuccess: async (created) => {
      onCreated(created.id);
      setName('');
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: api.groups.key() });
    },
  });
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Crear categoría</DrawerTitle>
        </DrawerHeader>
        <Label>Nombre</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Comida, transporte..."
        />
        <Label>Ícono</Label>
        <View style={styles.optionRow}>
          {ICONS.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={icon === item ? 'default' : 'outline'}
              onPress={() => setIcon(item)}
            >
              <Text
                style={icon === item ? styles.buttonText : styles.outlineText}
              >
                {item}
              </Text>
            </Button>
          ))}
        </View>
        <Label>Color</Label>
        <View style={styles.optionRow}>
          {COLORS.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={color === item ? 'default' : 'outline'}
              onPress={() => setColor(item)}
            >
              <Text
                style={{
                  color: color === item ? '#FFFFFF' : item,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                ●
              </Text>
            </Button>
          ))}
        </View>
        <DrawerFooter>
          <Button
            disabled={mutation.isPending || !name.trim()}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert(
                    'No se pudo crear la categoría',
                    'Intenta nuevamente.',
                  ),
              })
            }
          >
            <Text style={styles.buttonText}>
              {mutation.isPending ? 'Creando...' : 'Crear'}
            </Text>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#111827', fontSize: 14, fontWeight: '600' },
});
