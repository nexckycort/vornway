import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authClient, getAuthCallbackURL } from '@/lib/auth-client';

const slides = [
  {
    image: require('@/assets/images/login/slide-1.webp'),
    title: 'Organiza tu viaje sin estrés',
    description:
      'Desde el itinerario hasta los gastos, todo tu viaje en un solo lugar para que te enfoques en disfrutar.',
  },
  {
    image: require('@/assets/images/login/slide-2.webp'),
    title: 'Gastos en diferentes monedas',
    description:
      'Agrega gastos, divide como quieras y olvídate de las cuentas complicadas, incluso viajando entre países.',
  },
  {
    image: require('@/assets/images/login/slide-3.webp'),
    title: 'Haz realidad tus metas',
    description:
      'Crea metas de ahorro, haz seguimiento y llega preparado a tu próximo destino.',
  },
] as const;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const { data: session } = authClient.useSession();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace({ pathname: '/(tabs)' });
    }
  }, [router, session]);

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: getAuthCallbackURL(),
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      router.replace({ pathname: '/(tabs)' });
    } catch (signInError) {
      console.error('Error signing in with Google:', signInError);
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setIsLoading(false);
    }
  }

  function handleSlideChange(offsetX: number) {
    const nextSlide = Math.round(offsetX / width);
    setCurrentSlide(Math.max(0, Math.min(slides.length - 1, nextSlide)));
  }

  function goToSlide(index: number) {
    carouselRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentSlide(index);
  }

  const current = slides[currentSlide] ?? slides[0];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: width * slides.length, height }}
        onMomentumScrollEnd={(event) =>
          handleSlideChange(event.nativeEvent.contentOffset.x)
        }
      >
        {slides.map((slide) => (
          <Image
            key={slide.title}
            source={slide.image}
            resizeMode="cover"
            style={{ width, height }}
          />
        ))}
      </ScrollView>

      <View pointerEvents="none" style={styles.overlay} />

      <View
        pointerEvents="box-none"
        style={[styles.bottomContent, { paddingBottom: insets.bottom + 32 }]}
      >
        <View pointerEvents="none" style={styles.copy}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.description}>{current.description}</Text>
        </View>

        <View style={styles.indicators} accessibilityRole="tablist">
          {slides.map((slide, index) => (
            <Pressable
              key={slide.title}
              accessibilityRole="tab"
              accessibilityLabel={`Ir a la diapositiva ${index + 1}`}
              accessibilityState={{ selected: index === currentSlide }}
              onPress={() => goToSlide(index)}
              style={[
                styles.indicator,
                index === currentSlide
                  ? styles.activeIndicator
                  : styles.inactiveIndicator,
              ]}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
          disabled={isLoading}
          onPress={handleGoogleSignIn}
          testID="continue-with-google"
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
          ]}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>
            {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 480,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    opacity: 0.5,
  },
  bottomContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  copy: {
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
  },
  description: {
    color: '#BDBDBD',
    fontSize: 16,
    lineHeight: 24,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  activeIndicator: {
    width: 40,
    opacity: 1,
  },
  inactiveIndicator: {
    width: 20,
  },
  googleButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonPressed: {
    opacity: 0.95,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButtonText: {
    color: '#1E1E1E',
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    alignSelf: 'stretch',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
