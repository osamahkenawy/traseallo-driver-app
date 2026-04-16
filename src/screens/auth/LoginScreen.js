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
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useAuthStore from '../../store/authStore';
import {authApi} from '../../api';
import images from '../../theme/assets';
import {useTranslation} from 'react-i18next';

const {width: SCREEN_W} = Dimensions.get('window');
const HERO_HEIGHT = 340;
const ACCENT = '#f2421b';
const PRIMARY = '#244066';

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
  const formSlide = useRef(new Animated.Value(30)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const btnPressScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(fadeIn, {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.parallel([
        Animated.timing(formFade, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.spring(formSlide, {toValue: 0, tension: 60, friction: 10, useNativeDriver: true}),
      ]),
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

  const onBtnPressIn = useCallback(() => {
    Animated.spring(btnPressScale, {toValue: 0.96, tension: 100, friction: 8, useNativeDriver: true}).start();
  }, []);
  const onBtnPressOut = useCallback(() => {
    Animated.spring(btnPressScale, {toValue: 1, tension: 60, friction: 7, useNativeDriver: true}).start();
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      <KeyboardAwareScrollView
        style={s.flex}
        contentContainerStyle={{flexGrow: 1}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
        bounces={false}>

        {/* ═══ HERO IMAGE ═══════════════════════ */}
        <Animated.View style={[s.heroWrap, {opacity: fadeIn}]}>
          <Image source={images.loginHero} style={s.heroImage} resizeMode="cover" />
        </Animated.View>

        {/* ═══ FORM SECTION ═══════════════════════ */}
        <Animated.View style={[s.formSection, {opacity: formFade, transform: [{translateY: formSlide}]}]}>

          {/* Heading */}
          <Text style={s.heading}>{t('auth.nextDrive', 'Next drive?')}</Text>
          <Text style={s.subHeading}>{t('auth.letsGetMoving', "Let's get you moving!")}</Text>

          {/* Error */}
          {loginError ? (
            <Animated.View style={[s.errorBox, {transform: [{translateX: errorShake}]}]}>
              <Icon name="alert-circle" size={15} color={colors.danger} />
              <Text style={s.errorText} numberOfLines={2}>{loginError}</Text>
              <TouchableOpacity onPress={clearLoginError} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={14} color={colors.danger} />
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {/* ─── Email ────────────────────────── */}
          <Text style={s.label}>{t('auth.email', 'E-mail')}</Text>
          <View style={[
            s.fieldRow,
            focusedField === 'id' && s.fieldRowActive,
            loginError && s.fieldRowError,
          ]}>
            <Icon name="email-outline" size={18} color={colors.textLight} style={s.fieldIcon} />
            <TextInput
              style={s.fieldInput}
              value={identifier}
              onChangeText={val => { clearLoginError(); setIdentifier(val); }}
              placeholder={t('auth.emailPlaceholder', 'Enter your E-mail here')}
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="username"
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* ─── Password ─────────────────────── */}
          <Text style={s.label}>{t('auth.password', 'Password')}</Text>
          <View style={[
            s.fieldRow,
            focusedField === 'pw' && s.fieldRowActive,
            loginError && s.fieldRowError,
          ]}>
            <Icon name="lock-outline" size={18} color={colors.textLight} style={s.fieldIcon} />
            <TextInput
              ref={passwordRef}
              style={s.fieldInput}
              value={password}
              onChangeText={val => { clearLoginError(); setPassword(val); }}
              placeholder={t('auth.passwordPlaceholder', 'Enter your password here')}
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
                size={18}
                color={showPassword ? PRIMARY : colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* ─── Forgot Password ─────────────── */}
          <TouchableOpacity
            onPress={() => navigation.navigate(routeNames.ForgotPassword)}
            style={s.forgotRow}
            activeOpacity={0.6}>
            <Text style={s.forgotText}>{t('auth.forgotPassword', 'Forgot password?')}</Text>
          </TouchableOpacity>

          {/* ─── Login Button ──────────────────── */}
          <Animated.View style={{transform: [{scale: btnPressScale}], marginTop: 8}}>
            <TouchableOpacity
              onPress={handleLogin}
              onPressIn={onBtnPressIn}
              onPressOut={onBtnPressOut}
              disabled={isLoading}
              activeOpacity={0.85}
              style={[s.cta, !isFormValid && s.ctaDisabled]}>
              {isLoading ? (
                <View style={s.ctaLoadingRow}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={[s.ctaText, {marginLeft: 10}]}>{t('auth.signingIn', 'Signing in...')}</Text>
                </View>
              ) : (
                <Text style={s.ctaText}>{t('auth.login', 'Login')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>


        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── Styles ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},

  // ─── Hero image ────────────────────────────────
  heroWrap: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    backgroundColor: '#0a1628',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backdropFilter: 'blur(10)',
  },
  logo: {
    width: 200, height: 50,
  },

  // ─── Form section ─────────────────────────────
  formSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },

  heading: {
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: PRIMARY,
    lineHeight: 28,
  },
  subHeading: {
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: PRIMARY,
    lineHeight: 28,
    marginBottom: 28,
  },

  // ─── Error ─────────────────────────────────────
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderStartWidth: 3, borderStartColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 18,
    gap: 10,
  },
  errorText: {
    fontFamily: fontFamily.medium, fontSize: 12,
    color: colors.danger, flex: 1, lineHeight: 16,
  },

  // ─── Labels ────────────────────────────────────
  label: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: PRIMARY,
    marginBottom: 8,
    marginStart: 2,
  },

  // ─── Fields ────────────────────────────────────
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', height: 50,
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#D0D5DD',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  fieldRowActive: {
    borderColor: PRIMARY,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
      },
      android: {elevation: 2},
    }),
  },
  fieldRowError: {borderColor: 'rgba(235, 70, 109, 0.5)'},
  fieldIcon: {
    marginEnd: 10,
  },
  fieldInput: {
    flex: 1, height: '100%',
    fontFamily: fontFamily.regular, fontSize: 13,
    color: colors.textPrimary,
  },
  eyeBtn: {paddingHorizontal: 6, height: '100%', justifyContent: 'center'},

  // ─── Forgot ────────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: PRIMARY,
  },

  // ─── CTA ───────────────────────────────────────
  cta: {
    height: 50, borderRadius: 10,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
      },
      android: {elevation: 6},
    }),
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaLoadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  ctaText: {
    fontFamily: fontFamily.semiBold, fontSize: 16, color: '#FFF',
    letterSpacing: 0.3,
  },
});

export default LoginScreen;
