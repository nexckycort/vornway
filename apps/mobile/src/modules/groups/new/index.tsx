import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';

import {
  createGroupDraftId,
  loadGroupDraft,
  saveGroupDraft,
} from './group-create-draft';

export default function GroupCreateScreen() {
  const router = useRouter();
  const { draftId, from } = useLocalSearchParams<{
    draftId?: string;
    from?: 'home' | 'groups';
  }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spaceType, setSpaceType] = useState<'espacio' | 'personal'>('espacio');
  const [selectedSpaceType, setSelectedSpaceType] = useState<
    'espacio' | 'personal' | null
  >(draftId ? 'espacio' : null);
  const [step, setStep] = useState<'selection' | 'details'>(
    draftId ? 'details' : 'selection',
  );
  useEffect(() => {
    if (!draftId) return;
    void loadGroupDraft(draftId).then((draft) => {
      if (!draft) return;
      setName(draft.name);
      setDescription(draft.description);
      setSpaceType(draft.type);
      setStep('details');
    });
  }, [draftId]);
  async function submit() {
    if (!name.trim()) return;
    const nextDraftId = draftId ?? createGroupDraftId();
    await saveGroupDraft(nextDraftId, {
      name: name.trim(),
      type: spaceType,
      description: description.trim(),
    });
    router.push({
      pathname: '/groups/new/participants',
      params: {
        name: name.trim(),
        type: spaceType,
        description: description.trim(),
        draftId: nextDraftId,
        from: from === 'home' ? 'home' : 'groups',
      },
    } as never);
  }
  if (step === 'selection') {
    return (
      <Screen>
        <ScreenHeader
          title="Nuevo espacio"
          onBack={() =>
            router.replace(
              from === 'home' ? ('/(tabs)' as never) : ('/spaces' as never),
            )
          }
        />
        <Card style={styles.card}>
          <Text style={styles.heading}>¿Qué quieres organizar?</Text>
          <Text style={styles.hint}>
            Elige el tipo de espacio para continuar.
          </Text>
          <Button
            variant={selectedSpaceType === 'espacio' ? 'default' : 'outline'}
            onPress={() => {
              setSpaceType('espacio');
              setSelectedSpaceType('espacio');
            }}
          >
            <Text
              style={
                selectedSpaceType === 'espacio'
                  ? styles.buttonText
                  : styles.outlineText
              }
            >
              Espacio compartido
            </Text>
          </Button>
          <Button
            variant={selectedSpaceType === 'personal' ? 'default' : 'outline'}
            onPress={() => {
              setSpaceType('personal');
              setSelectedSpaceType('personal');
            }}
          >
            <Text
              style={
                selectedSpaceType === 'personal'
                  ? styles.buttonText
                  : styles.outlineText
              }
            >
              Espacio personal
            </Text>
          </Button>
          <Button
            disabled={!selectedSpaceType}
            onPress={() => setStep('details')}
          >
            <Text style={styles.buttonText}>Continuar</Text>
          </Button>
        </Card>
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenHeader
        title="Nuevo espacio"
        onBack={() =>
          router.replace(
            from === 'home' ? ('/(tabs)' as never) : ('/spaces' as never),
          )
        }
      />
      <Card style={styles.card}>
        <Label>Nombre</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Viaje a Cartagena"
        />
        <Label>Tipo de espacio</Label>
        <Button
          variant={spaceType === 'espacio' ? 'default' : 'outline'}
          onPress={() => setSpaceType('espacio')}
        >
          <Text style={styles.buttonText}>Compartido</Text>
        </Button>
        <Button
          variant={spaceType === 'personal' ? 'default' : 'outline'}
          onPress={() => setSpaceType('personal')}
        >
          <Text style={styles.buttonText}>Personal</Text>
        </Button>
        <Label>Descripción</Label>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
        />
        <Button disabled={!name.trim()} onPress={submit}>
          <Text style={styles.buttonText}>Continuar con participantes</Text>
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  heading: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  hint: { color: '#64748B', fontSize: 12 },
});
