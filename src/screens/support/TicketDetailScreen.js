/**
 * Trasealla Driver App — Ticket Detail & Reply Screen (Premium)
 * Chat-style conversation view with status badge, category, priority
 */

import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
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

/* ─── Constants ──────────────────────────────────── */
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

const PRIORITY_COLORS = {
  low: colors.success,
  medium: colors.warning,
  high: colors.orange,
  critical: colors.danger,
};

const normalizeDate = raw => {
  if (!raw) return null;
  let s = String(raw);
  if (!s.endsWith('Z') && !s.includes('+') && !/\d{2}:\d{2}$/.test(s.slice(-6))) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = d => {
  const dt = normalizeDate(d);
  if (!dt) return '';
  return dt.toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = d => {
  const dt = normalizeDate(d);
  if (!dt) return '';
  return dt.toLocaleTimeString('en-AE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ─── Component ──────────────────────────────────── */
const TicketDetailScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const ticketId = route.params?.ticketId;

  const {
    currentTicket,
    isLoadingDetail,
    isReplying,
    fetchTicketDetail,
    replyToTicket,
  } = useSupportStore();

  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (ticketId) fetchTicketDetail(ticketId);
  }, [ticketId]);

  const handleSend = useCallback(async () => {
    const text = message.trim();
    if (!text) return;
    try {
      await replyToTicket(ticketId, text);
      setMessage('');
      setTimeout(
        () => scrollRef.current?.scrollToEnd?.({animated: true}),
        200,
      );
    } catch {
      Alert.alert(t('common.error'), t('support.failedReply'));
    }
  }, [message, ticketId]);

  const ticket = currentTicket;

  // Debug: log ticket shape on initial render
  useEffect(() => {
    if (__DEV__ && ticket) {
      console.log('[TicketDetail] ticket keys:', Object.keys(ticket));
      console.log('[TicketDetail] id:', ticket.id, 'subject:', ticket.subject, 'status:', ticket.status);
    }
  }, [ticket]);

  const replies = ticket?.replies || [];
  const rawStatus = (ticket?.status || 'open').toLowerCase();
  const statusColor = STATUS_COLORS[rawStatus] || colors.textMuted;
  const statusIcon = STATUS_ICONS[rawStatus] || 'help-circle';
  const prioColor = PRIORITY_COLORS[ticket?.priority] || colors.textMuted;
  const isClosed = rawStatus === 'closed';

  /* ─── Render ───────────────────────────────────── */
  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ─── Header ──────────────────────────── */}
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

          <View style={$.headerCenter}>
            <Text style={$.headerTitle} numberOfLines={1}>
              {ticket?.subject || t('support.title')}
            </Text>
            {ticket && (
              <Text style={$.headerSub}>
                #{ticket.id} · {formatDate(ticket.created_at)}
              </Text>
            )}
          </View>

          {/* Status badge */}
          <View
            style={[$.headerBadge, {backgroundColor: statusColor + '25'}]}>
            <Icon
              name={statusIcon}
              size={12}
              color={statusColor}
              style={{marginRight: 4}}
            />
            <Text style={[$.headerBadgeText, {color: statusColor}]}>
              {t(
                'support.ticketStatus' +
                  rawStatus.charAt(0).toUpperCase() +
                  rawStatus.slice(1),
                rawStatus,
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Main Content ────────────────────── */}
      {isLoadingDetail ? (
        <View style={$.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !ticket ? (
        <View style={$.centered}>
          <View style={$.emptyIconWrap}>
            <Icon name="alert-circle" size={36} color={colors.textLight} />
          </View>
          <Text style={$.emptyText}>{t('support.ticketNotFound')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={10}>
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={$.messagesWrap}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd?.({animated: false})
            }>
            {/* ─── Original Ticket Card ─── */}
            <View style={$.ticketCard}>
              {/* Meta row: category + priority */}
              <View style={$.ticketMeta}>
                {ticket.category && (
                  <View style={$.categoryPill}>
                    <Icon
                      name="help-circle"
                      size={11}
                      color={colors.primary}
                      style={{marginRight: 4}}
                    />
                    <Text style={$.categoryText}>
                      {t(`support.${ticket.category}`, ticket.category)}
                    </Text>
                  </View>
                )}
                {ticket.priority && (
                  <View
                    style={[
                      $.prioPill,
                      {backgroundColor: prioColor + '12'},
                    ]}>
                    <View
                      style={[$.prioPillDot, {backgroundColor: prioColor}]}
                    />
                    <Text style={[$.prioPillText, {color: prioColor}]}>
                      {t(`support.priority${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}`, ticket.priority)}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={$.ticketSubject}>{ticket.subject}</Text>

              {ticket.description ? (
                <Text style={$.ticketDesc}>{ticket.description}</Text>
              ) : null}

              <View style={$.ticketFooter}>
                <Icon
                  name="clock-outline"
                  size={12}
                  color={colors.textLight}
                  style={{marginRight: 4}}
                />
                <Text style={$.ticketDate}>
                  {formatDate(ticket.created_at)}
                </Text>
              </View>
            </View>

            {/* ─── Replies separator ─── */}
            {replies.length > 0 && (
              <View style={$.dividerRow}>
                <View style={$.dividerLine} />
                <Text style={$.dividerText}>
                  {t('support.replies', 'Replies')} ({replies.length})
                </Text>
                <View style={$.dividerLine} />
              </View>
            )}

            {/* ─── Reply Bubbles ─── */}
            {replies.map((r, idx) => {
              const isAdmin =
                r.sender_type === 'admin' || r.sender_type === 'support' || r.is_admin;
              return (
                <View key={r.id || idx} style={{marginBottom: spacing.md}}>
                  {/* Sender name */}
                  <Text
                    style={[
                      $.senderName,
                      isAdmin
                        ? {textAlign: 'left'}
                        : {textAlign: 'right'},
                    ]}>
                    {isAdmin
                      ? t('support.supportAgent')
                      : t('support.you')}
                  </Text>

                  <View
                    style={[
                      $.bubble,
                      isAdmin ? $.bubbleAdmin : $.bubbleDriver,
                    ]}>
                    {/* Avatar */}
                    <View
                      style={[
                        $.avatar,
                        isAdmin ? $.avatarAdmin : $.avatarDriver,
                      ]}>
                      <Icon
                        name={isAdmin ? 'headset' : 'account'}
                        size={14}
                        color={isAdmin ? colors.primary : '#FFF'}
                      />
                    </View>

                    {/* Message body */}
                    <View style={[
                      $.bubbleBody,
                      isAdmin ? $.bubbleBodyAdmin : $.bubbleBodyDriver,
                    ]}>
                      <Text
                        style={[
                          $.bubbleText,
                          isAdmin
                            ? {color: colors.textPrimary}
                            : {color: '#FFF'},
                        ]}>
                        {r.message || r.content || r.body || ''}
                      </Text>
                      <Text
                        style={[
                          $.bubbleTime,
                          isAdmin
                            ? {color: colors.textMuted}
                            : {color: 'rgba(255,255,255,0.6)'},
                        ]}>
                        {formatDateShort(r.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* No replies yet */}
            {replies.length === 0 && (
              <View style={$.noReplies}>
                <View style={$.noRepliesIcon}>
                  <Icon
                    name="message-text-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <Text style={$.noRepliesText}>
                  {t('support.noRepliesYet')}
                </Text>
              </View>
            )}

            {/* Resolution note */}
            {ticket.resolution && (
              <View style={$.resolutionCard}>
                <View style={$.resolutionHeader}>
                  <Icon
                    name="check-circle"
                    size={14}
                    color={colors.success}
                    style={{marginRight: 6}}
                  />
                  <Text style={$.resolutionTitle}>
                    {t('support.resolution', 'Resolution')}
                  </Text>
                </View>
                <Text style={$.resolutionText}>{ticket.resolution}</Text>
              </View>
            )}
          </ScrollView>

          {/* ─── Reply Input Bar ─── */}
          {!isClosed ? (
            <View style={[$.inputBar, {paddingBottom: ins.bottom + 8}]}>
              <View style={$.inputWrap}>
                <TextInput
                  style={$.input}
                  placeholder={t('support.typeReply')}
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={2000}
                />
              </View>
              <TouchableOpacity
                style={[
                  $.sendBtn,
                  (!message.trim() || isReplying) && {opacity: 0.35},
                ]}
                disabled={!message.trim() || isReplying}
                onPress={handleSend}
                activeOpacity={0.7}>
                {isReplying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="send" size={17} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[$.closedBar, {paddingBottom: ins.bottom + 8}]}>
              <View style={$.closedIconWrap}>
                <Icon name="lock-outline" size={14} color={colors.textMuted} />
              </View>
              <Text style={$.closedText}>{t('support.ticketClosed')}</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

/* ─── Styles ────────────────────────────────────── */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bgScreen},

  /* ─── Header ─── */
  header: {
    height: 68,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
  },
  headerShape1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50,
    right: -10,
  },
  headerShape2: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -25,
    left: 20,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#FFF',
  },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm + 2,
  },
  headerBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    textTransform: 'capitalize',
  },

  /* ─── Centered states ─── */
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },

  /* ─── Messages area ─── */
  messagesWrap: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },

  /* ─── Original ticket card ─── */
  ticketCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  ticketMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  categoryText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.primary,
  },
  prioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  prioPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  prioPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  ticketSubject: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 22,
  },
  ticketDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketDate: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textLight,
  },

  /* ─── Divider ─── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },

  /* ─── Sender Name ─── */
  senderName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  /* ─── Chat Bubbles ─── */
  bubble: {
    flexDirection: 'row',
    maxWidth: '88%',
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
  },
  bubbleDriver: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdmin: {
    backgroundColor: colors.primary + '12',
    marginRight: spacing.sm,
  },
  avatarDriver: {
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  bubbleBody: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bubbleBodyAdmin: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleBodyDriver: {
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTime: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    marginTop: 6,
    textAlign: 'right',
  },

  /* ─── No replies ─── */
  noReplies: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  noRepliesIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  noRepliesText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* ─── Resolution ─── */
  resolutionCard: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resolutionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.success,
  },
  resolutionText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },

  /* ─── Reply Input ─── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.bgGray,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    maxHeight: 100,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'auto',
    paddingVertical: Platform.OS === 'ios' ? 4 : spacing.sm,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },

  /* ─── Closed Bar ─── */
  closedBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  closedText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default TicketDetailScreen;
