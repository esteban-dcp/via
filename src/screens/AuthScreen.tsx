import { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../state/userStore';
import { supabase } from '../services/supabase';
import { useScalePress } from '../hooks/useScalePress';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { colors, radius, spacing } from '../theme';

export const AuthScreen = () => {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, status, error } = useUserStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [tabsWidth, setTabsWidth] = useState(0);

  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(16);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);
  const googleOpacity = useSharedValue(0);
  const tabPosition = useSharedValue(0);

  useEffect(() => {
    tabPosition.value = withTiming(mode === 'signup' ? 1 : 0, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
    });
  }, [mode]);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    logoTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });

    setTimeout(() => {
      taglineOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
      taglineTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    }, 150);

    setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      cardTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, 350);

    setTimeout(() => {
      googleOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 600);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const googleStyle = useAnimatedStyle(() => ({
    opacity: googleOpacity.value,
  }));

  const indicatorStyle = useAnimatedStyle(() => {
    const tabW = tabsWidth > 4 ? (tabsWidth - 4) / 2 : 0;
    return {
      transform: [{ translateX: tabPosition.value * tabW }],
      width: tabW,
    };
  });

  const switchMode = useCallback((newMode: 'login' | 'signup') => {
    setMode(newMode);
    setAuthError(null);
    setSignupSuccess(false);
  }, []);

  const handleGoogleSignIn = useCallback(() => {
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleEmailAuth = useCallback(async () => {
    if (!email || !password) {
      setAuthError('Correo y contraseña requeridos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Ingresa un correo válido');
      return;
    }

    if (password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setAuthError(null);
    setSignupSuccess(false);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
          },
        });
        if (error) {
          setAuthError(error.message);
        } else {
          setSignupSuccess(true);
          setEmail('');
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setAuthError('Correo no confirmado. Revisa tu bandeja de entrada.');
          } else {
            setAuthError(error.message);
          }
        }
      }
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [email, password, mode]);

  const displayError = authError || error;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#060C28', '#0A1450', '#021A70', '#011360']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(3, 74, 248, 0.15)', 'rgba(3, 74, 248, 0.04)', 'transparent']}
        style={[StyleSheet.absoluteFill, { top: 0, height: '50%' }]}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.brandRow, logoStyle]}>
            <Image source={require('../../assets/android-icon-foreground.png')} style={styles.logoImage} />
            <Text style={styles.appName}>VIA</Text>
          </Animated.View>
          <Animated.View style={taglineStyle}>
            <Text style={styles.tagline}>Precios de combustible en vivo impulsados por tu ciudad.</Text>
          </Animated.View>

          <Animated.View style={[styles.authCard, cardStyle]}>
            <View style={styles.modeTabs} onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}>
              <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
              <Pressable style={styles.modeTab} onPress={() => switchMode('login')}>
                <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>Iniciar sesión</Text>
              </Pressable>
              <Pressable style={styles.modeTab} onPress={() => switchMode('signup')}>
                <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
                  Crear cuenta
                </Text>
              </Pressable>
            </View>

            {signupSuccess ? (
              <View style={styles.successCard}>
                <Ionicons name="mail-open" size={20} color={colors.success} />
                <Text style={styles.successTitle}>Revisa tu correo</Text>
                <Text style={styles.successText}>
                  Te enviamos un enlace de confirmación a {email}. Revisa tu bandeja de entrada y luego inicia sesión.
                </Text>
              </View>
            ) : (
              <>
                <TextField
                  icon="mail"
                  placeholder="Correo electrónico"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ marginBottom: spacing.md }}
                />

                <TextField
                  icon="lock-closed"
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  rightAction={
                    <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  }
                />

                {!!displayError && (
                  <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={14} color={colors.danger} />
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}

                <Button
                  title={mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
                  onPress={handleEmailAuth}
                  loading={loading}
                  disabled={loading}
                  style={{ marginTop: spacing.md }}
                  size="lg"
                />
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <Animated.View style={googleStyle}>
              <GoogleButton onPress={handleGoogleSignIn} loading={status === 'loading'} />
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const GoogleButton = ({ onPress, loading }: { onPress: () => void; loading: boolean }) => {
  const { animatedStyle, onPressIn, onPressOut } = useScalePress(0.97);

  return (
    <Animated.View style={animatedStyle}>
      <Button
        title="Continuar con Google"
        icon="logo-google"
        variant="secondary"
        onPress={onPress}
        loading={loading}
        disabled={loading}
        size="md"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  tagline: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: 15,
  },
  authCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 22, 40, 0.7)',
    borderRadius: 999,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  modeTabText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.textPrimary,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  successTitle: {
    color: colors.success,
    fontSize: 17,
    fontWeight: '700',
  },
  successText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  dividerRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.25)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
});
