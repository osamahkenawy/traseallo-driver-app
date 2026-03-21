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

const {width: W} = Dimensions.get('window');

const OnboardingScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();

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
          <Text style={s.title}>Welcome to Traseallo</Text>
          <Text style={s.subtitle}>
            Manage your deliveries, track earnings,{'\n'}and stay connected with customers.
          </Text>
        </View>

        {/* ─── Feature Pills ─────────────────── */}
        <View style={s.pillsRow}>
          {[
            {icon: 'truck-fast-outline', label: 'Fast Delivery'},
            {icon: 'chart-line', label: 'Track Earnings'},
            {icon: 'headset', label: 'Live Support'},
          ].map((f, i) => (
            <View key={i} style={s.pill}>
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
          onPress={() => navigation.replace('Login')}>
          <Text style={s.btnText}>Get Started</Text>
          <Icon name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>

        {/* ─── Powered by ────────────────────── */}
        <View style={s.poweredRow}>
          <Image source={images.traseallaLogo} style={s.poweredLogo} resizeMode="contain" />
          <Text style={s.poweredText}>Powered by Trasealla Solutions</Text>
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

  pillsRow: {flexDirection: 'row', gap: 8, marginTop: 20},
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '18',
  },
  pillText: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.primary},

  bottom: {paddingBottom: 20, alignItems: 'center'},
  poweredRow: {alignItems: 'center', marginTop: 16, gap: 4},
  poweredLogo: {width: 70, height: 22},
  poweredText: {fontFamily: fontFamily.regular, fontSize: 9, color: colors.textMuted},
  btn: {
    height: 50, backgroundColor: colors.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnText: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},
});

export default OnboardingScreen;
