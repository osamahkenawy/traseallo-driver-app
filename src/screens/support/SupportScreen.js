/**
 * Trasealla Driver App — Support Screen
 * Create support tickets, view ticket history, report issues
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import useSupportStore from '../../store/supportStore';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';

const ISSUE_TYPES = [
  {labelKey: 'support.orderIssue', value: 'order_issue'},
  {labelKey: 'support.appBug', value: 'app_bug'},
  {labelKey: 'support.paymentProblem', value: 'payment'},
  {labelKey: 'support.navigation', value: 'navigation'},
  {labelKey: 'support.account', value: 'account'},
  {labelKey: 'support.other', value: 'other'},
];

const STATUS_COLORS = {
  open: colors.warning,
  pending: colors.warning,
  resolved: colors.success,
  closed: colors.textMuted,
};

const SupportScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {
    tickets,
    isLoadingTickets,
    isSubmitting,
    createTicket,
    fetchTickets,
    loadMoreTickets,
    resetTickets,
  } = useSupportStore();
  const {t} = useTranslation();

  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('');

  useEffect(() => {
    if (tab === 'history') {
      fetchTickets({page: 1});
    }
  }, [tab, fetchTickets]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(t('support.required'), t('support.enterSubject'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('support.required'), t('support.describeIssue'));
      return;
    }

    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: issueType || 'other',
      });
      setSubject('');
      setDescription('');
      setIssueType('');
      Alert.alert(t('support.submitted'), t('support.ticketCreated'));
      setTab('history');
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error?.response?.data?.message || t('support.failedSubmit'),
      );
    }
  };

  const onRefresh = useCallback(() => {
    resetTickets();
    fetchTickets({page: 1});
  }, []);

  const renderTicket = useCallback(
    ({item}) => {
      const raw = (item.status || 'open').toLowerCase();
      const statusColor = STATUS_COLORS[raw] || colors.textMuted;
      const statusKey = 'support.ticketStatus' + raw.charAt(0).toUpperCase() + raw.slice(1);
      return (
        <TouchableOpacity
          style={s.ticketCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(routeNames.TicketDetail, {ticketId: item.id})}>
          <View style={s.ticketRow}>
            <View style={[s.ticketDot, {backgroundColor: statusColor}]} />
            <View style={s.ticketBody}>
              <Text style={s.ticketSubject} numberOfLines={1}>
                {item.subject || t('support.noSubject')}
              </Text>
              <Text style={s.ticketDesc} numberOfLines={2}>
                {item.description || ''}
              </Text>
              <Text style={s.ticketDate}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
              </Text>
            </View>
            <View style={{alignItems: 'flex-end', gap: 8}}>
              <View style={[s.ticketBadge, {backgroundColor: statusColor + '18'}]}>
                <Text style={[s.ticketBadgeText, {color: statusColor}]}>
                  {t(statusKey, raw).toUpperCase()}
                </Text>
              </View>
              <Icon name="chevron-right" size={14} color={colors.textLight} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [t],
  );

  const isNew = tab === 'new';

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* ─── Header ──────────────────────────── */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={18} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('support.title')}</Text>
        <View style={s.backBtn} />
      </View>

      {/* ─── Segmented Tabs ──────────────────── */}
      <View style={s.tabWrapper}>
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, isNew && s.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab('new')}>
            <Icon
              name="plus-circle"
              size={14}
              color={isNew ? '#FFF' : colors.textMuted}
              style={{marginEnd: 6}}
            />
            <Text style={[s.tabText, isNew && s.tabTextActive]}>
              {t('support.newTicket')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, !isNew && s.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab('history')}>
            <Icon
              name="list"
              size={14}
              color={!isNew ? '#FFF' : colors.textMuted}
              style={{marginEnd: 6}}
            />
            <Text style={[s.tabText, !isNew && s.tabTextActive]}>
              {t('support.myTickets')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Content ─────────────────────────── */}
      {isNew ? (
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Issue Type */}
            <Text style={s.label}>{t('support.issueType')}</Text>
            <View style={s.typeRow}>
              {ISSUE_TYPES.map(type => {
                const active = issueType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[s.typePill, active && s.typePillActive]}
                    activeOpacity={0.7}
                    onPress={() => setIssueType(type.value)}>
                    {active && (
                      <Icon name="check" size={12} color="#FFF" style={{marginEnd: 4}} />
                    )}
                    <Text style={[s.typePillText, active && s.typePillTextActive]}>
                      {t(type.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subject */}
            <Text style={s.label}>{t('support.subject')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('support.subjectPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            {/* Description */}
            <Text style={s.label}>{t('support.description')}</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder={t('support.descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, isSubmitting && {opacity: 0.5}]}
              disabled={isSubmitting}
              activeOpacity={0.8}
              onPress={handleSubmit}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="send" size={16} color="#FFF" style={{marginEnd: 8}} />
                  <Text style={s.submitBtnText}>{t('support.submitTicket')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item, idx) => `ticket-${item.id || idx}`}
          renderItem={renderTicket}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={isLoadingTickets} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreTickets}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoadingTickets ? (
              <View style={s.empty}>
                <Icon name="inbox" size={48} color={colors.border} />
                <Text style={s.emptyTitle}>{t('support.noTickets')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

/* ─── Styles ────────────────────────────────────── */
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bgScreen},

  /* Header */
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'auto',
  },

  /* Segmented Tabs */
  tabWrapper: {paddingHorizontal: 20, marginBottom: 8},
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgGray,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {color: '#FFF'},

  /* Form */
  formScroll: {paddingHorizontal: 20, paddingBottom: 40},
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
    marginStart: 2,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  typePillTextActive: {color: '#FFF'},
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'auto',
  },
  textArea: {minHeight: 130, paddingTop: 14},
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#FFF',
  },

  /* Ticket List */
  list: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  ticketCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ticketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginEnd: 12,
  },
  ticketBody: {flex: 1, marginEnd: 10},
  ticketSubject: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ticketBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ticketBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  ticketDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
    lineHeight: 18,
  },
  ticketDate: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textLight,
  },

  /* Empty state */
  empty: {alignItems: 'center', paddingTop: 80, gap: 12},
  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textMuted,
  },
});

export default SupportScreen;
