/**
 * Trasealla Driver App — Support Screen (Premium)
 * Create tickets, view history, filter by status
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
import {spacing} from '../../theme/spacing';
import {borderRadius} from '../../theme/borderRadius';
import {shadows} from '../../theme/shadows';
import {routeNames} from '../../constants/routeNames';

/* ─── Constants ──────────────────────────────────── */
const CATEGORIES = [
  {key: 'order_issue', icon: 'package-variant', labelKey: 'support.orderIssue'},
  {key: 'app_bug', icon: 'alert-circle', labelKey: 'support.appBug'},
  {key: 'payment', icon: 'credit-card-outline', labelKey: 'support.paymentProblem'},
  {key: 'navigation', icon: 'navigation-variant', labelKey: 'support.navigation'},
  {key: 'account', icon: 'account', labelKey: 'support.account'},
  {key: 'other', icon: 'help-circle', labelKey: 'support.other'},
];

const PRIORITIES = [
  {key: 'low', color: colors.success, labelKey: 'support.priorityLow'},
  {key: 'medium', color: colors.warning, labelKey: 'support.priorityMedium'},
  {key: 'high', color: colors.orange, labelKey: 'support.priorityHigh'},
  {key: 'critical', color: colors.danger, labelKey: 'support.priorityCritical'},
];

const STATUS_COLORS = {
  open: colors.warning,
  pending: colors.warning,
  in_progress: colors.info,
  waiting: colors.purple,
  resolved: colors.success,
  closed: colors.textMuted,
};

const STATUS_ICONS = {
  open: 'clock-outline',
  pending: 'clock-outline',
  in_progress: 'autorenew',
  waiting: 'timer-sand',
  resolved: 'check-circle',
  closed: 'lock-outline',
};

const STATUS_FILTERS = [
  {key: null, labelKey: 'support.allTickets'},
  {key: 'open', labelKey: 'support.ticketStatusOpen'},
  {key: 'in_progress', labelKey: 'support.ticketStatusIn_progress'},
  {key: 'waiting', labelKey: 'support.ticketStatusWaiting'},
  {key: 'resolved', labelKey: 'support.ticketStatusResolved'},
  {key: 'closed', labelKey: 'support.ticketStatusClosed'},
];

const timeAgo = dateStr => {
  if (!dateStr) return '';
  // Normalize: if no timezone info, treat as UTC
  let raw = String(dateStr);
  if (!raw.endsWith('Z') && !raw.includes('+') && !/\d{2}:\d{2}$/.test(raw.slice(-6))) {
    raw += 'Z';
  }
  const now = new Date();
  const date = new Date(raw);
  if (isNaN(date.getTime())) return '';
  const diffMs = now - date;
  if (diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AE', {day: 'numeric', month: 'short'});
};

/* ─── Component ──────────────────────────────────── */
const SupportScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const {
    tickets,
    isLoadingTickets,
    isSubmitting,
    createTicket,
    fetchTickets,
    loadMoreTickets,
    resetTickets,
  } = useSupportStore();

  const [tab, setTab] = useState('new');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState(null);

  /* — Fetch tickets when switching to history or changing filter */
  useEffect(() => {
    if (tab === 'history') {
      resetTickets();
      const params = {page: 1};
      if (statusFilter) params.status = statusFilter;
      fetchTickets(params);
    }
  }, [tab, statusFilter]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(t('support.required'), t('support.enterSubject'));
      return;
    }
    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category: category || 'other',
        priority,
      });
      setSubject('');
      setDescription('');
      setCategory('');
      setPriority('medium');
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
    const params = {page: 1};
    if (statusFilter) params.status = statusFilter;
    fetchTickets(params);
  }, [statusFilter]);

  const isNew = tab === 'new';

  /* ─── Ticket Card ──────────────────────────────── */
  const renderTicket = useCallback(
    ({item}) => {
      const raw = (item.status || 'open').toLowerCase();
      const statusColor = STATUS_COLORS[raw] || colors.textMuted;
      const statusIcon = STATUS_ICONS[raw] || 'help-circle';
      const statusKey =
        'support.ticketStatus' + raw.charAt(0).toUpperCase() + raw.slice(1);
      const prioItem = PRIORITIES.find(p => p.key === item.priority);
      const prioColor = prioItem?.color || colors.textMuted;
      const catItem = CATEGORIES.find(c => c.key === item.category);

      return (
        <TouchableOpacity
          style={$.ticketCard}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate(routeNames.TicketDetail, {ticketId: item.id})
          }>
          {/* Left accent bar */}
          <View style={[$.ticketAccent, {backgroundColor: statusColor}]} />

          <View style={$.ticketContent}>
            {/* Top: status badge + priority + time */}
            <View style={$.ticketTopRow}>
              <View
                style={[
                  $.statusPill,
                  {backgroundColor: statusColor + '12'},
                ]}>
                <Icon
                  name={statusIcon}
                  size={11}
                  color={statusColor}
                  style={{marginRight: 4}}
                />
                <Text style={[$.statusPillText, {color: statusColor}]}>
                  {t(statusKey, raw)}
                </Text>
              </View>

              {prioItem && (
                <View
                  style={[
                    $.prioBadge,
                    {backgroundColor: prioColor + '12'},
                  ]}>
                  <View
                    style={[$.prioBadgeDot, {backgroundColor: prioColor}]}
                  />
                  <Text style={[$.prioBadgeText, {color: prioColor}]}>
                    {t(prioItem.labelKey, prioItem.key)}
                  </Text>
                </View>
              )}

              <Text style={$.ticketTime}>{timeAgo(item.created_at)}</Text>
            </View>

            {/* Subject */}
            <Text style={$.ticketSubject} numberOfLines={1}>
              {item.subject || t('support.noSubject')}
            </Text>

            {/* Description preview */}
            {item.description ? (
              <Text style={$.ticketDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Bottom: category + ticket id + chevron */}
            <View style={$.ticketBottom}>
              <View style={$.ticketBottomLeft}>
                {catItem && (
                  <View style={$.catChipSmall}>
                    <Icon
                      name={catItem.icon}
                      size={11}
                      color={colors.primary}
                      style={{marginRight: 4}}
                    />
                    <Text style={$.catChipSmallText}>
                      {t(catItem.labelKey)}
                    </Text>
                  </View>
                )}
                <Text style={$.ticketId}>#{item.id}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textLight} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [t, statusFilter],
  );

  /* ─── Render ───────────────────────────────────── */
  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ─── Premium Header ──────────────────── */}
      <View style={$.header}>
        <View style={$.headerBg}>
          <View style={$.headerShape1} />
          <View style={$.headerShape2} />
        </View>
        <View style={$.headerRow}>
          <TouchableOpacity
            style={$.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="arrow-left" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={$.headerTitle}>{t('support.title')}</Text>
          <View style={$.headerIconCircle}>
            <Icon name="headset" size={18} color="#FFF" />
          </View>
        </View>
      </View>

      {/* ─── Segmented Tabs ──────────────────── */}
      <View style={$.tabWrapper}>
        <View style={$.tabBar}>
          <TouchableOpacity
            style={[$.tab, isNew && $.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab('new')}>
            <Icon
              name="plus-circle"
              size={15}
              color={isNew ? '#FFF' : colors.textMuted}
              style={{marginRight: 6}}
            />
            <Text style={[$.tabText, isNew && $.tabTextActive]}>
              {t('support.newTicket')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[$.tab, !isNew && $.tabActive]}
            activeOpacity={0.7}
            onPress={() => setTab('history')}>
            <Icon
              name="list"
              size={15}
              color={!isNew ? '#FFF' : colors.textMuted}
              style={{marginRight: 6}}
            />
            <Text style={[$.tabText, !isNew && $.tabTextActive]}>
              {t('support.myTickets')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Content ─────────────────────────── */}
      {isNew ? (
        /* ─── NEW TICKET FORM ──────────────── */
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={$.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Category / Issue Type */}
            <Text style={$.sectionLabel}>{t('support.issueType')}</Text>
            <View style={$.categoryGrid}>
              {CATEGORIES.map(cat => {
                const active = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[$.categoryChip, active && $.categoryChipActive]}
                    activeOpacity={0.7}
                    onPress={() => setCategory(cat.key)}>
                    <View
                      style={[
                        $.categoryIconWrap,
                        active && $.categoryIconWrapActive,
                      ]}>
                      <Icon
                        name={cat.icon}
                        size={18}
                        color={active ? '#FFF' : colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        $.categoryChipLabel,
                        active && $.categoryChipLabelActive,
                      ]}
                      numberOfLines={1}>
                      {t(cat.labelKey)}
                    </Text>
                    {active && (
                      <View style={$.categoryCheck}>
                        <Icon name="check" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority */}
            <Text style={$.sectionLabel}>{t('support.priority')}</Text>
            <View style={$.priorityRow}>
              {PRIORITIES.map(p => {
                const active = priority === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      $.priorityPill,
                      active && {
                        backgroundColor: p.color + '15',
                        borderColor: p.color,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setPriority(p.key)}>
                    <View
                      style={[
                        $.prioDot,
                        {backgroundColor: p.color},
                        active && {
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        $.prioLabel,
                        active && {
                          color: p.color,
                          fontFamily: fontFamily.semiBold,
                        },
                      ]}>
                      {t(p.labelKey, p.key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subject */}
            <Text style={$.sectionLabel}>{t('support.subject')}</Text>
            <View style={$.inputRow}>
              <Icon
                name="text-box-outline"
                size={18}
                color={colors.textLight}
                style={{marginRight: 10}}
              />
              <TextInput
                style={$.inputText}
                placeholder={t('support.subjectPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            {/* Description */}
            <Text style={$.sectionLabel}>{t('support.description')}</Text>
            <TextInput
              style={$.textArea}
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
              style={[$.submitBtn, isSubmitting && {opacity: 0.55}]}
              disabled={isSubmitting}
              activeOpacity={0.8}
              onPress={handleSubmit}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon
                    name="send"
                    size={18}
                    color="#FFF"
                    style={{marginRight: 10}}
                  />
                  <Text style={$.submitText}>
                    {t('support.submitTicket')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ─── MY TICKETS ───────────────────── */
        <View style={{flex: 1}}>
          {/* Status Filter Row */}
          <View style={$.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={$.filterRow}>
              {STATUS_FILTERS.map(f => {
                const active = statusFilter === f.key;
                const sColor = f.key
                  ? STATUS_COLORS[f.key] || colors.textMuted
                  : colors.primary;
                return (
                  <TouchableOpacity
                    key={f.key || 'all'}
                    style={[
                      $.filterChip,
                      active && {
                        backgroundColor: sColor,
                        borderColor: sColor,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter(f.key)}>
                    {f.key && !active && (
                      <View
                        style={[$.filterDot, {backgroundColor: sColor}]}
                      />
                    )}
                    {active && (
                      <Icon
                        name={f.key ? (STATUS_ICONS[f.key] || 'check') : 'view-grid'}
                        size={12}
                        color="#FFF"
                        style={{marginRight: 5}}
                      />
                    )}
                    <Text
                      style={[
                        $.filterText,
                        active && $.filterTextActive,
                      ]}>
                      {t(f.labelKey, f.key || 'All')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Ticket List */}
          <FlatList
            data={tickets}
            keyExtractor={(item, idx) => `ticket-${item.id || idx}`}
            renderItem={renderTicket}
            contentContainerStyle={$.list}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingTickets}
                onRefresh={onRefresh}
              />
            }
            onEndReached={loadMoreTickets}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              !isLoadingTickets ? (
                <View style={$.empty}>
                  <View style={$.emptyIconWrap}>
                    <Icon name="inbox" size={44} color={colors.primary} />
                  </View>
                  <Text style={$.emptyTitle}>
                    {t('support.noTickets')}
                  </Text>
                  <Text style={$.emptySub}>
                    {t('support.noTicketsDesc')}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

/* ─── Styles ────────────────────────────────────── */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bgScreen},

  /* ─── Header ─── */
  header: {
    height: 64,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
  },
  headerShape1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -20,
  },
  headerShape2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    left: 30,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#FFF',
    textAlign: 'center',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Tabs ─── */
  tabWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgGray,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: borderRadius.sm + 2,
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
    shadowColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {color: '#FFF'},

  /* ─── Form ─── */
  formScroll: {paddingHorizontal: spacing.xl, paddingBottom: 40},
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    letterSpacing: 0.2,
  },

  /* Category Grid (3 columns via flexWrap) */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  categoryChip: {
    width: '30.33%',
    marginHorizontal: '1.5%',
    marginBottom: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconWrapActive: {
    backgroundColor: colors.primary,
  },
  categoryChipLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryChipLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  categoryCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Priority */
  priorityRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm + 2,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  prioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  prioLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* Input */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  inputText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 14,
    textAlign: 'auto',
  },
  textArea: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 130,
    textAlignVertical: 'top',
    textAlign: 'auto',
  },

  /* Submit */
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxxl,
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  submitText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#FFF',
  },

  /* ─── Status Filter ─── */
  filterContainer: {
    paddingBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  filterText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
    fontFamily: fontFamily.semiBold,
  },

  /* ─── Ticket List ─── */
  list: {paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 24},

  ticketCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.soft,
  },
  ticketAccent: {
    width: 4,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  ticketContent: {
    flex: 1,
    padding: spacing.lg,
  },

  /* Top row */
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  prioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginLeft: 6,
  },
  prioBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  prioBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
  },
  ticketTime: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textLight,
    marginLeft: 'auto',
  },

  /* Middle */
  ticketSubject: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  ticketDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },

  /* Bottom */
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '08',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  catChipSmallText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.primary,
  },
  ticketId: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textLight,
  },

  /* ─── Empty ─── */
  empty: {alignItems: 'center', paddingTop: 80},
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default SupportScreen;
