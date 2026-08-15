import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { feedbackClient } from '@/api/feedback';

import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
} from './feedback.types';

const statusLabels: Record<FeedbackStatus, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  PLANNED: 'Planeado',
  DONE: 'Completado',
  REJECTED: 'Descartado',
};

export default function FeedbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<FeedbackType>(
    params.type === 'FEATURE_REQUEST' ? 'FEATURE_REQUEST' : 'BUG',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<Array<{ uri: string; dataUrl: string }>>(
    [],
  );
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadFeedback = useCallback(async () => {
    const response = await feedbackClient.index.$get({
      query: { limit: '20' },
    });
    if (response.ok)
      setItems(((await response.json()) as { data: FeedbackItem[] }).data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  async function chooseImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    setImages((current) =>
      [
        ...current,
        ...result.assets
          .filter((asset) => asset.base64)
          .map((asset) => ({
            uri: asset.uri,
            dataUrl: `data:image/jpeg;base64,${asset.base64}`,
          })),
      ].slice(0, 5),
    );
  }

  async function submit() {
    if (!title.trim() || !description.trim()) {
      Alert.alert(
        'Completa los campos',
        'El título y la descripción son obligatorios.',
      );
      return;
    }
    setSubmitting(true);
    const response = await feedbackClient.index.$post({
      json: {
        type,
        title: title.trim(),
        description: description.trim(),
        images: images.map((image) => ({ dataUrl: image.dataUrl })),
      },
    });
    setSubmitting(false);
    if (!response.ok) {
      Alert.alert('No se pudo enviar', 'Intenta nuevamente.');
      return;
    }
    setTitle('');
    setDescription('');
    setImages([]);
    Alert.alert(
      'Enviado',
      type === 'BUG'
        ? 'Gracias por reportar el problema.'
        : 'Gracias por tu sugerencia.',
    );
    await loadFeedback();
  }

  function remove(item: FeedbackItem) {
    Alert.alert('Eliminar reporte', '¿Quieres eliminar este reporte?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const response = await feedbackClient[':feedbackId'].$delete({
            param: { feedbackId: item.id },
          });
          if (response.ok)
            setItems((current) =>
              current.filter((entry) => entry.id !== item.id),
            );
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Feedback</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.typeSwitch}>
          <Pressable
            onPress={() => setType('BUG')}
            style={[styles.typeButton, type === 'BUG' && styles.typeActive]}
          >
            <Text
              style={type === 'BUG' ? styles.typeActiveText : styles.typeText}
            >
              Reportar error
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType('FEATURE_REQUEST')}
            style={[
              styles.typeButton,
              type === 'FEATURE_REQUEST' && styles.typeActive,
            ]}
          >
            <Text
              style={
                type === 'FEATURE_REQUEST'
                  ? styles.typeActiveText
                  : styles.typeText
              }
            >
              Solicitar función
            </Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={
              type === 'BUG' ? '¿Qué ocurrió?' : '¿Qué te gustaría agregar?'
            }
            style={styles.input}
          />
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Cuéntanos los detalles"
            style={[styles.input, styles.textarea]}
          />
          <View style={styles.attachmentHeader}>
            <Text style={styles.label}>Imágenes</Text>
            <Text style={styles.count}>{images.length}/5</Text>
          </View>
          <Pressable
            disabled={images.length >= 5}
            onPress={() => void chooseImages()}
            style={styles.addImages}
          >
            <Text style={styles.addImagesText}>＋ Agregar imágenes</Text>
          </Pressable>
          {images.length > 0 ? (
            <ScrollView horizontal contentContainerStyle={styles.imageList}>
              {images.map((image) => (
                <Image
                  key={image.uri}
                  source={{ uri: image.uri }}
                  style={styles.preview}
                />
              ))}
            </ScrollView>
          ) : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={styles.submit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {type === 'BUG' ? 'Enviar error' : 'Enviar funcionalidad'}
              </Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>Mis reportes</Text>
        <Text style={styles.sectionCopy}>
          Consulta el estado de tus solicitudes.
        </Text>
        {loading ? (
          <ActivityIndicator color="#DE034D" />
        ) : items.filter((item) => item.type === type).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {type === 'BUG'
                ? 'Aún no tienes errores reportados.'
                : 'Aún no tienes funciones solicitadas.'}
            </Text>
          </View>
        ) : (
          items
            .filter((item) => item.type === type)
            .map((item) => (
              <View key={item.id} style={styles.feedbackCard}>
                <View style={styles.feedbackTop}>
                  <View style={styles.feedbackCopy}>
                    <Text numberOfLines={1} style={styles.feedbackTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.feedbackType}>
                      {type === 'BUG'
                        ? 'Error reportado'
                        : 'Función solicitada'}
                    </Text>
                  </View>
                  <View style={styles.feedbackActions}>
                    <Text style={styles.status}>
                      {statusLabels[item.status]}
                    </Text>
                    <Pressable onPress={() => remove(item)}>
                      <Text style={styles.delete}>×</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.description}>{item.description}</Text>
                {item.metadata.attachments?.length ? (
                  <ScrollView horizontal>
                    {item.metadata.attachments.map((image) => (
                      <Image
                        key={image.url}
                        source={{ uri: image.url }}
                        style={styles.attachment}
                      />
                    ))}
                  </ScrollView>
                ) : null}
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('es-CO')}
                </Text>
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 152, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  back: { color: '#202124', fontSize: 34, lineHeight: 34 },
  headerSpacer: { width: 24 },
  pageTitle: { color: '#0F172A', fontSize: 24, fontWeight: '600' },
  typeSwitch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  typeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  typeText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  typeActiveText: { color: '#DE034D', fontSize: 12, fontWeight: '600' },
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 28,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  label: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 14,
  },
  textarea: { minHeight: 130, paddingTop: 14, textAlignVertical: 'top' },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: { color: '#64748B', fontSize: 12 },
  addImages: {
    minHeight: 46,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addImagesText: { color: '#475569', fontSize: 14, fontWeight: '500' },
  imageList: { gap: 8 },
  preview: { width: 76, height: 76, borderRadius: 14 },
  submit: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE034D',
    marginTop: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '600',
    marginTop: 12,
  },
  sectionCopy: { color: '#64748B', fontSize: 14 },
  empty: {
    padding: 18,
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  emptyText: { color: '#64748B', fontSize: 14 },
  feedbackCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  feedbackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedbackCopy: { flex: 1, gap: 4 },
  feedbackTitle: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  feedbackType: { color: '#64748B', fontSize: 12 },
  feedbackActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: {
    color: '#B45309',
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '600',
  },
  delete: { color: '#64748B', fontSize: 24 },
  description: { color: '#334155', fontSize: 14, lineHeight: 21 },
  attachment: { width: 80, height: 80, borderRadius: 14, marginRight: 8 },
  date: { color: '#94A3B8', fontSize: 11 },
});
