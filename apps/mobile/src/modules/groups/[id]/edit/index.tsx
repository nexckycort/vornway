import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('viajes');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('load_failed');
      return response.json();
    },
  });
  const group =
    groupQuery.data && 'name' in groupQuery.data ? groupQuery.data : null;
  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setType(group.type || 'viajes');
    setDescription(group.description ?? '');
    setImageDataUrl(null);
  }, [group]);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].$patch({
        param: { id: id ?? '' },
        json: {
          name: name.trim(),
          type: type.trim(),
          description: description.trim() || undefined,
          ...(imageDataUrl
            ? { image: { dataUrl: imageDataUrl, fileName: 'group-image.jpg' } }
            : {}),
        },
      });
      if (!response.ok) throw new Error('save_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      router.back();
    },
  });
  async function chooseImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.base64) {
      setImageDataUrl(
        `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`,
      );
    }
  }
  return (
    <Screen>
      <ScreenHeader title="Editar espacio" onBack={() => router.back()} />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          <Label>Nombre</Label>
          <Input value={name} onChangeText={setName} />
          <Label>Descripción</Label>
          <Input value={description} onChangeText={setDescription} />
          <Label>Tipo de espacio</Label>
          {(['viajes', 'meta', 'personal', 'otros'] as const).map((value) => (
            <Button
              key={value}
              variant={type === value ? 'default' : 'outline'}
              onPress={() => setType(value)}
            >
              <Text
                style={type === value ? styles.buttonText : styles.outlineText}
              >
                {value === 'viajes'
                  ? 'Viaje'
                  : value === 'meta'
                    ? 'Meta'
                    : value === 'personal'
                      ? 'Personal'
                      : 'Otro'}
              </Text>
            </Button>
          ))}
          <Label>Imagen</Label>
          {imageDataUrl || group?.imageUrl ? (
            <Image
              source={{ uri: imageDataUrl ?? group?.imageUrl ?? undefined }}
              style={styles.image}
              contentFit="cover"
            />
          ) : null}
          <Button variant="outline" onPress={() => void chooseImage()}>
            <Text style={styles.outlineText}>Cambiar imagen</Text>
          </Button>
          <Button
            disabled={mutation.isPending || !name.trim()}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert('No se pudo guardar', 'Intenta nuevamente.'),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar cambios</Text>
            )}
          </Button>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  image: { borderRadius: 16, height: 120, width: 120 },
});
