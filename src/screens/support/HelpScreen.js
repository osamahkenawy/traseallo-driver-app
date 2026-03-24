/**
 * Trasealla Driver App — Help & FAQ Screen
 * Accordion FAQ + contact info + search
 */

import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from '../../utils/LucideIcon';
import useSupportStore from '../../store/supportStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HelpScreen = () => {
  const ins = useSafeAreaInsets();
  const navigation = useNavigation();
  const {help, isLoading, fetchHelp} = useSupportStore();
  const {t} = useTranslation();
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHelp();
  }, []);

  const onRefresh = useCallback(() => fetchHelp(), []);

  const faqs = help?.faqs || help?.items || [];
  const contactInfo = help?.contact || null;

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      f =>
        (f.question || f.title || '').toLowerCase().includes(q) ||
        (f.answer || f.content || '').toLowerCase().includes(q),
    );
  }, [faqs, search]);

  const toggleFaq = idx => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const contactActions = [];
  if (contactInfo?.phone) {
    contactActions.push({
      icon: 'phone',
      label: t('help.phone'),
      value: contactInfo.phone,
      color: colors.success,
      onPress: () => Linking.openURL(`tel:${contactInfo.phone}`),
    });
  }
  if (contactInfo?.email) {
    contactActions.push({
      icon: 'mail',
      label: t('help.email'),
      value: contactInfo.email,
      color: colors.info,
      onPress: () => Linking.openURL(`mailto:${contactInfo.email}`),
    });
  }
  if (contactInfo?.whatsapp) {
    contactActions.push({
      icon: 'message-circle',
      label: t('help.whatsapp'),
      value: contactInfo.whatsapp,
      color: colors.success,
      onPress: () =>
        Linking.openURL(
          `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`,
        ),
    });
  }

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('help.title')}</Text>
        <View style={{width: 20}} />
      </View>

      {isLoading && !help ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Search Bar */}
          {faqs.length > 0 && (
            <View style={s.searchBox}>
              <Icon name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder={t('help.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="x" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* FAQ Section */}
          {filteredFaqs.length > 0 && (
            <View style={s.section}>
              <Text style={s.secTitle}>{t('help.faqTitle')}</Text>
              {filteredFaqs.map((faq, idx) => {
                const isOpen = expandedIdx === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[s.faqCard, isOpen && s.faqCardOpen]}
                    activeOpacity={0.7}
                    onPress={() => toggleFaq(idx)}>
                    <View style={s.faqHeader}>
                      <View style={[s.faqDot, isOpen && {backgroundColor: colors.primary}]} />
                      <Text style={[s.faqQ, isOpen && {color: colors.primary}]}>
                        {faq.question || faq.title || `Question ${idx + 1}`}
                      </Text>
                      <Icon
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isOpen ? colors.primary : colors.textLight}
                      />
                    </View>
                    {isOpen && (
                      <Text style={s.faqA}>
                        {faq.answer || faq.content || t('help.noAnswer')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {search && filteredFaqs.length === 0 && (
            <View style={s.emptySearch}>
              <Icon name="search" size={32} color={colors.border} />
              <Text style={s.emptySearchText}>{t('common.noResults')}</Text>
            </View>
          )}

          {/* Contact Section */}
          {contactActions.length > 0 && (
            <View style={s.section}>
              <Text style={s.secTitle}>{t('help.contactSupport')}</Text>
              <View style={s.contactGrid}>
                {contactActions.map((c, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.contactCard}
                    activeOpacity={0.7}
                    onPress={c.onPress}>
                    <View style={[s.contactIc, {backgroundColor: c.color + '12'}]}>
                      <Icon name={c.icon} size={18} color={c.color} />
                    </View>
                    <Text style={s.contactLabel}>{c.label}</Text>
                    <Text style={s.contactVal} numberOfLines={1}>{c.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={s.ctaBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(routeNames.Support)}>
            <Icon name="headphones" size={18} color="#FFF" style={{marginEnd: 8}} />
            <Text style={s.ctaBtnText}>{t('help.createTicket')}</Text>
          </TouchableOpacity>

          {faqs.length === 0 && !contactInfo && !isLoading && (
            <View style={s.empty}>
              <View style={s.emptyIc}>
                <Icon name="help-circle" size={28} color={colors.textLight} />
              </View>
              <Text style={s.emptyH}>{t('help.noContent')}</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scroll: {paddingHorizontal: 20, paddingBottom: 40},

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
    textAlign: 'auto',
  },

  section: {marginBottom: 24},
  secTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary, marginBottom: 12},

  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  faqCardOpen: {borderColor: colors.primary + '30'},
  faqHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  faqDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight},
  faqQ: {flex: 1, fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary},
  faqA: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    marginStart: 16,
  },

  emptySearch: {alignItems: 'center', paddingVertical: 40, gap: 10},
  emptySearchText: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted},

  contactGrid: {flexDirection: 'row', gap: 10, flexWrap: 'wrap'},
  contactCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 6,
  },
  contactIc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted},
  contactVal: {fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.primary},

  ctaBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaBtnText: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},

  empty: {alignItems: 'center', paddingVertical: 50, gap: 10},
  emptyIc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyH: {fontFamily: fontFamily.medium, fontSize: 14, color: colors.textMuted},
});

export default HelpScreen;
