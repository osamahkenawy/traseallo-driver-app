/**
 * WebView Screen — Displays TOS, Privacy Policy, or any URL
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {useTranslation} from 'react-i18next';

const ALLOWED_DOMAINS = [
  'trasealla.com',
  'api.trasealla.com',
  'delivery.trasealla.com',
  'traseallo.com',
  'api.traseallo.com',
  'delivery.traseallo.com',
];

const isAllowedUrl = (urlString) => {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
};

const WebViewScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const {url, title} = route.params || {};
  const safeUrl = isAllowedUrl(url) ? url : 'about:blank';
  const [loading, setLoading] = useState(true);

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle} numberOfLines={1}>
          {title || t('common.webPage')}
        </Text>
        <View style={{width: 20}} />
      </View>

      {/* Loading bar */}
      {loading && (
        <View style={s.loadingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.loadingText}>{t('common.loading')}</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{uri: safeUrl}}
        style={s.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  hdrTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  webview: {flex: 1},
});

export default WebViewScreen;
