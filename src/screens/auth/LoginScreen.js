/**
 * Login Screen — Driver authentication
 * Supports login with email OR username.
 */

import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  StatusBar,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useAuthStore from '../../store/authStore';
import {authApi} from '../../api';
import images from '../../theme/assets';
import {useTranslation} from 'react-i18next';

const LoginScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [branding, setBranding] = useState(null);

  const passwordRef = useRef(null);

  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const loginError = useAuthStore(state => state.loginError);
  const clearLoginError = useAuthStore(state => state.clearLoginError);

  // ─── Animations ────────────────────────────────
  const fadeIn = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-20)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.92)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeIn, {toValue: 1, duration: 600, useNativeDriver: true}),
        Animated.spring(heroSlide, {toValue: 0, tension: 50, friction: 9, useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(formFade, {toValue: 1, duration: 500, useNativeDriver: true}),
        Animated.spring(formSlide, {toValue: 0, tension: 60, friction: 10, useNativeDriver: true}),
      ]),
      Animated.spring(btnScale, {toValue: 1, tension: 80, friction: 8, useNativeDriver: true}),
    ]).start();
  }, []);

  useEffect(() => {
    if (loginError) {
      Animated.sequence([
        Animated.timing(errorShake, {toValue: 10, duration: 50, useNativeDriver: true}),
        Animated.timing(errorShake, {toValue: -10, duration: 50, useNativeDriver: true}),
        Animated.timing(errorShake, {toValue: 6, duration: 50, useNativeDriver: true}),
        Animated.timing(errorShake, {toValue: -6, duration: 50, useNativeDriver: true}),
        Animated.timing(errorShake, {toValue: 0, duration: 50, useNativeDriver: true}),
      ]).start();
    }
  }, [loginError]);

  // Fetch tenant branding on mount
  useEffect(() => {
    let cancelled = false;
    const fetchBranding = async () => {
      try {
        const res = await authApi.getBranding('swiftdrop');
        const data = res.data?.data || res.data;
        if (!cancelled && data) setBranding(data);
      } catch {
        // Silently fail — fall back to default logo
      }
    };
    fetchBranding();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = useCallback(async () => {
    if (!identifier.trim() || !password.trim()) return;
    try {
      await login(identifier.trim(), password.trim());
    } catch (e) {
      if (__DEV__) console.warn('Login error:', e.message);
    }
  }, [identifier, password, login]);

  const isFormValid = identifier.trim().length > 0 && password.trim().length > 0;
  const isEmail = identifier.includes('@');

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgScreen} />

      {/* ═══ BACKGROUND DECORATIONS ═══════════════ */}
      <View style={s.bgDecor}>
        <View style={s.decoCircle1} />
        <View style={s.decoCircle2} />
        <View style={s.decoCircle3} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, {paddingTop: ins.top + 24}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>

          {/* ═══ HERO — Logo & Branding ═══════════ */}
          <Animated.View style={[s.hero, {opacity: fadeIn, transform: [{translateY: heroSlide}]}]}>
            {/* Main logo — dynamic tenant branding or fallback */}
            {branding?.logo_url ? (
              <Image source={{uri: branding.logo_url}} style={s.logo} resizeMode="contain" />
            ) : (
              <Image source={images.logoFullColor3x} style={s.logo} resizeMode="contain" />
            )}
          </Animated.View>

          {/* ═══ FORM CARD ════════════════════════ */}
          <Animated.View style={[s.card, {opacity: formFade, transform: [{translateY: formSlide}]}]}>

            {/* Card title */}
            <Text style={s.cardTitle}>{t('auth.letsGetMoving')}</Text>
            <Text style={s.cardSub}>{t('auth.signInSubtitle')}</Text>

            {/* Error */}
            {loginError ? (
              <Animated.View style={[s.errorBox, {transform: [{translateX: errorShake}]}]}>
                <Icon name="alert-circle" size={18} color={colors.danger} />
                <Text style={s.errorText} numberOfLines={2}>{loginError}</Text>
                <TouchableOpacity onPress={clearLoginError} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} style={{marginLeft: 12}}>
                  <Icon name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {/* ─── Email / Username ─────────────── */}
            <Text style={s.label}>{t('auth.emailOrUsername')}</Text>
            <View style={[
              s.fieldRow,
              focusedField === 'id' && s.fieldRowActive,
              loginError && s.fieldRowError,
            ]}>
              <View style={[s.fieldIcon, focusedField === 'id' && s.fieldIconActive]}>
                <Icon
                  name={isEmail ? 'at' : 'account-outline'}
                  size={18}
                  color={focusedField === 'id' ? '#FFF' : colors.primary}
                />
              </View>
              <TextInput
                style={s.fieldInput}
                value={identifier}
                onChangeText={val => { clearLoginError(); setIdentifier(val); }}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={isEmail ? 'email-address' : 'default'}
                textContentType="username"
                autoComplete="username"
                onFocus={() => setFocusedField('id')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {identifier.length > 0 && (
                <TouchableOpacity onPress={() => setIdentifier('')} style={s.fieldClear}>
                  <Icon name="close-circle" size={16} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* ─── Password ─────────────────────── */}
            <Text style={s.label}>{t('auth.password')}</Text>
            <View style={[
              s.fieldRow,
              focusedField === 'pw' && s.fieldRowActive,
              loginError && s.fieldRowError,
            ]}>
              <View style={[s.fieldIcon, focusedField === 'pw' && s.fieldIconActive]}>
                <Icon
                  name="lock-outline"
                  size={18}
                  color={focusedField === 'pw' ? '#FFF' : colors.primary}
                />
              </View>
              <TextInput
                ref={passwordRef}
                style={s.fieldInput}
                value={password}
                onChangeText={val => { clearLoginError(); setPassword(val); }}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                autoComplete="password"
                onFocus={() => setFocusedField('pw')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                style={s.eyeBtn}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={showPassword ? colors.primary : colors.textLight}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity
              onPress={() => navigation.navigate(routeNames.ForgotPassword)}
              style={s.forgotRow}
              activeOpacity={0.6}>
              <Text style={s.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* ─── Sign In Button ────────────────── */}
            <Animated.View style={{transform: [{scale: btnScale}]}}>
              <TouchableOpacity
                style={[s.cta, !isFormValid && s.ctaOff]}
                onPress={handleLogin}
                disabled={isLoading || !isFormValid}
                activeOpacity={0.85}>
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={s.ctaText}>{t('auth.signIn')}</Text>
                    <View style={{width: 8, marginLeft: 12}} />
                    <View style={s.ctaArrow}>
                      <Icon name="arrow-right" size={18} color={colors.primary} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* ═══ FOOTER ═══════════════════════════ */}
          <View style={[s.footer, {paddingBottom: ins.bottom + 20}]}>
            <View style={s.footerSecure}>
              <Icon name="shield-check-outline" size={13} color={colors.success} />
              <Text style={s.footerSecureTxt}>{t('auth.secureConnection')}</Text>
            </View>
            <Image source={images.traseallaLogo} style={s.footerLogo} resizeMode="contain" />
            <Text style={s.footerCopy}>{t('common.poweredBy')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── Styles ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bgScreen},
  flex: {flex: 1},
  scroll: {flexGrow: 1, paddingHorizontal: 24, paddingBottom: 20},

  // ─── Background decorations ────────────────────
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute', top: -100, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(36, 64, 102, 0.04)',
  },
  decoCircle2: {
    position: 'absolute', top: 160, left: -120,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(21, 199, 174, 0.04)',
  },
  decoCircle3: {
    position: 'absolute', bottom: 80, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(36, 64, 102, 0.03)',
  },

  // ─── Hero ──────────────────────────────────────
  hero: {alignItems: 'center', marginBottom: 32, paddingTop: 16},
  logo: {
    width: 240, height: 70,
    marginBottom: 14,
  },
  brandName: {
    fontFamily: fontFamily.medium, fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tagPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(21, 199, 174, 0.2)',
  },
  tagDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.success,
  },
  tagText: {
    fontFamily: fontFamily.bold, fontSize: 11, color: colors.success,
    letterSpacing: 2,
  },

  // ─── Card ──────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(36, 64, 102, 0.08)',
        shadowOpacity: 1,
        shadowRadius: 24,
        shadowOffset: {width: 0, height: 8},
      },
      android: {elevation: 4},
    }),
  },
  cardTitle: {
    fontFamily: fontFamily.bold, fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  cardSub: {
    fontFamily: fontFamily.regular, fontSize: 14,
    color: colors.textMuted,
    marginBottom: 28,
  },

  // ─── Error ─────────────────────────────────────
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderStartWidth: 3, borderStartColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 24,
  },
  errorText: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: colors.danger, flex: 1, lineHeight: 18, marginLeft: 12,
  },

  // ─── Labels ────────────────────────────────────
  label: {
    fontFamily: fontFamily.semiBold, fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 10,
    marginStart: 2,
  },

  // ─── Fields ────────────────────────────────────
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', height: 56,
    backgroundColor: '#F5F8FC', borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border,
    marginBottom: 20,
  },
  fieldRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 3},
      },
      android: {elevation: 2},
    }),
  },
  fieldRowError: {borderColor: 'rgba(235, 70, 109, 0.35)'},
  fieldIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(36, 64, 102, 0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginStart: 9, marginEnd: 4,
  },
  fieldIconActive: {
    backgroundColor: colors.primary,
  },
  fieldInput: {
    flex: 1, height: '100%',
    fontFamily: fontFamily.medium, fontSize: 15,
    color: colors.textPrimary,
    paddingStart: 10, paddingEnd: 4,
  },
  fieldClear: {paddingHorizontal: 14, height: '100%', justifyContent: 'center'},
  eyeBtn: {paddingHorizontal: 16, height: '100%', justifyContent: 'center'},

  // ─── Forgot ────────────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 26,
    marginTop: -8,
  },
  forgotText: {
    fontFamily: fontFamily.semiBold, fontSize: 13,
    color: colors.primary,
  },

  // ─── CTA ───────────────────────────────────────
  cta: {
    height: 56, borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 6},
      },
      android: {elevation: 6},
    }),
  },
  ctaOff: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: fontFamily.bold, fontSize: 16, color: '#FFF',
    letterSpacing: 0.3,
  },
  ctaArrow: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Footer ────────────────────────────────────
  footer: {alignItems: 'center', marginTop: 30},
  footerSecure: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4,
  },
  footerSecureTxt: {
    fontFamily: fontFamily.medium, fontSize: 11, color: colors.success, marginLeft: 6,
  },
  footerLogo: {width: 90, height: 26, marginTop: 10},
  footerCopy: {
    fontFamily: fontFamily.regular, fontSize: 11, color: colors.textLight, marginTop: 10,
  },
});

export default LoginScreen;
