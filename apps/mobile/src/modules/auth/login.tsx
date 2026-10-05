import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const carouselRef = useRef<ScrollViewInstance>(null);
  const { data: session } = authClient.useSession();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
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

  function getEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Escribe tu correo.');
      return null;
    }

    return normalizedEmail;
  }

  async function handleSendOtp() {
    const normalizedEmail = getEmail();
    if (!normalizedEmail) return;

    setError(null);
    setIsOtpLoading(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: 'sign-in',
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setOtpSent(true);
    } catch (sendOtpError) {
      console.error('Error sending email OTP:', sendOtpError);
      setError('No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setIsOtpLoading(false);
    }
  }

  async function handleOtpSignIn() {
    const normalizedEmail = getEmail();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail) return;
    if (!normalizedOtp) {
      setError('Escribe el código OTP.');
      return;
    }

    setError(null);
    setIsOtpLoading(true);

    try {
      const result = await authClient.signIn.emailOtp({
        email: normalizedEmail,
        otp: normalizedOtp,
        name: normalizedEmail.split('@')[0] || 'Vornway Dev',
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      router.replace({ pathname: '/(tabs)' });
    } catch (signInError) {
      console.error('Error signing in with email OTP:', signInError);
      setError('Código incorrecto o expirado.');
    } finally {
      setIsOtpLoading(false);
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

        {__DEV__ ? (
          <View style={styles.devLogin}>
            <Text style={styles.devLoginLabel}>Acceso local de desarrollo</Text>
            <Input
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Correo"
              placeholderTextColor="#8A8A8A"
              style={styles.devInput}
              value={email}
            />
            {otpSent ? (
              <>
                <Input
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  onChangeText={setOtp}
                  placeholder="Código OTP"
                  placeholderTextColor="#8A8A8A"
                  style={styles.devInput}
                  value={otp}
                />
                <View style={styles.devActions}>
                  <Button
                    disabled={isOtpLoading}
                    onPress={handleOtpSignIn}
                    style={styles.devButton}
                  >
                    <Text style={styles.devButtonText}>
                      {isOtpLoading ? 'Verificando...' : 'Entrar con OTP'}
                    </Text>
                  </Button>
                  <Button
                    disabled={isOtpLoading}
                    onPress={handleSendOtp}
                    variant="outline"
                    style={styles.devSecondaryButton}
                  >
                    <Text style={styles.devSecondaryButtonText}>
                      Reenviar código
                    </Text>
                  </Button>
                </View>
              </>
            ) : (
              <Button
                disabled={isOtpLoading}
                onPress={handleSendOtp}
                style={styles.devButton}
              >
                <Text style={styles.devButtonText}>
                  {isOtpLoading ? 'Enviando...' : 'Enviar código OTP'}
                </Text>
              </Button>
            )}
          </View>
        ) : null}

        <Button
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
          disabled={isLoading}
          onPress={handleGoogleSignIn}
          testID="continue-with-google"
          style={styles.googleButton}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>
            {isLoading ? 'Redirigiendo...' : 'Continuar con Google'}
          </Text>
        </Button>

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
  devLogin: {
    gap: 8,
  },
  devLoginLabel: {
    color: '#D6D6D6',
    fontSize: 12,
    fontWeight: '600',
  },
  devInput: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    color: '#1E1E1E',
    fontSize: 14,
  },
  devActions: {
    flexDirection: 'row',
    gap: 8,
  },
  devButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#DE034D',
    paddingHorizontal: 12,
  },
  devButtonPressed: {
    opacity: 0.8,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  devSecondaryButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  devSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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
