/**
 * Onboarding Screen — First-time driver walkthrough
 */

import React from 'react';
import {View, StyleSheet, Text, Image, TouchableOpacity, Dimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../utils/LucideIcon';
import {colors} from '../theme/colors';
import {fontFamily} from '../theme/fonts';
import images from '../theme/assets';
import {useTranslation} from 'react-i18next';
import {routeNames} from '../constants/routeNames';

const {width: W} = Dimensions.get('window');

const OnboardingScreen = ({navigation, onComplete}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();

  const handleGetStarted = () => {
    if (typeof onComplete === 'function') {
      onComplete();
    } else {
      navigation.replace(routeNames.Login);
    }
  };

  return (
    <View style={[s.root, {paddingTop: ins.top, paddingBottom: ins.bottom}]}>
      {/* ─── Logo ────────────────────────────── */}
      <View style={s.top}>
        <Image source={images.logoFullColored} style={s.logo} resizeMode="contain" />
      </View>

      {/* ─── Hero ────────────────────────────── */}
      <View style={s.center}>
        <Image source={images.onboarding1} style={s.illustration} resizeMode="contain" />

        <View style={s.textWrap}>
          <Text style={s.title}>{t('onboarding.welcome')}</Text>
          <Text style={s.subtitle}>
            {t('onboarding.welcomeDesc')}
          </Text>
        </View>

        {/* ─── Feature Pills ─────────────────── */}
        <View style={s.pillsRow}>
          {[
            {icon: 'truck-fast-outline', label: t('onboarding.fastDelivery')},
            {icon: 'chart-line', label: t('onboarding.trackEarnings')},
            {icon: 'headset', label: t('onboarding.liveSupport')},
          ].map((f, i) => (
            <View key={i} style={[s.pill, i > 0 && {marginLeft: 8}]}>
              <Icon name={f.icon} size={13} color={colors.primary} />
              <Text style={s.pillText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── CTA ─────────────────────────────── */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          activeOpacity={0.8}
          onPress={handleGetStarted}>
          <Text style={s.btnText}>{t('onboarding.getStarted')}</Text>
          <Icon name="arrow-right" size={18} color="#FFF" style={{marginLeft: 8}} />
        </TouchableOpacity>

        {/* ─── Powered by ────────────────────── */}
        <View style={s.poweredRow}>
          <Image source={images.traseallaLogo} style={s.poweredLogo} resizeMode="contain" />
          <Text style={s.poweredText}>{t('onboarding.poweredBy')}</Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#FFF', paddingHorizontal: 24},

  top: {alignItems: 'center', paddingTop: 20},
  logo: {width: 150, height: 50},

  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  illustration: {width: W * 0.55, height: W * 0.55, marginBottom: 24},
  textWrap: {alignItems: 'center'},
  title: {fontFamily: fontFamily.bold, fontSize: 22, color: colors.primary, textAlign: 'center'},
  subtitle: {fontFamily: fontFamily.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 21},

  pillsRow: {flexDirection: 'row', marginTop: 20},
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '18',
  },
  pillText: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.primary, marginLeft: 5},

  bottom: {paddingBottom: 20, alignItems: 'center'},
  poweredRow: {alignItems: 'center', marginTop: 16},
  poweredLogo: {width: 70, height: 22},
  poweredText: {fontFamily: fontFamily.regular, fontSize: 9, color: colors.textMuted, marginTop: 4},
  btn: {
    height: 50, backgroundColor: colors.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    width: '100%',
  },
  btnText: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},
});

export default OnboardingScreen;
