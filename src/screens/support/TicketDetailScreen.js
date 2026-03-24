/**
 * Trasealla Driver App — Ticket Detail & Reply Screen
 * Chat-style conversation view for a single support ticket
 */

import React, {useEffect, useState, useRef} from 'react';
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

const STATUS_COLORS = {
  open: colors.warning,
  pending: colors.warning,
  in_progress: colors.info,
  resolved: colors.success,
  closed: colors.textMuted,
};

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
    if (ticketId) {
      fetchTicketDetail(ticketId);
    }
  }, [ticketId]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
    try {
      await replyToTicket(ticketId, text);
      setMessage('');
      setTimeout(() => scrollRef.current?.scrollToEnd?.({animated: true}), 200);
    } catch {
      Alert.alert(t('common.error'), t('support.failedReply'));
    }
  };

  const ticket = currentTicket;
  const replies = ticket?.replies || [];
  const rawStatus = (ticket?.status || 'open').toLowerCase();
  const statusColor = STATUS_COLORS[rawStatus] || colors.textMuted;
  const isClosed = rawStatus === 'closed' || rawStatus === 'resolved';

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{flex: 1, marginHorizontal: 14}}>
          <Text style={s.hdrTitle} numberOfLines={1}>
            {ticket?.subject || t('support.title')}
          </Text>
          {ticket && (
            <Text style={s.hdrSub}>#{ticket.id} · {formatDate(ticket.created_at)}</Text>
          )}
        </View>
        <View style={[s.statusBadge, {backgroundColor: statusColor + '15'}]}>
          <View style={[s.statusDot, {backgroundColor: statusColor}]} />
          <Text style={[s.statusTxt, {color: statusColor}]}>
            {t('support.ticketStatus' + rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1), rawStatus)}
          </Text>
        </View>
      </View>

      {isLoadingDetail ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !ticket ? (
        <View style={s.loading}>
          <Icon name="alert-circle" size={40} color={colors.textLight} />
          <Text style={s.emptyText}>{t('support.ticketNotFound')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={10}>
          {/* Messages area */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd?.({animated: false})
            }>
            {/* Original ticket as first message */}
            <View style={s.ticketCard}>
              <View style={s.ticketCategoryRow}>
                {ticket.category && (
                  <View style={s.categoryPill}>
                    <Text style={s.categoryText}>
                      {t(`support.${ticket.category}`, ticket.category)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={s.ticketSubject}>{ticket.subject}</Text>
              <Text style={s.ticketDesc}>{ticket.description}</Text>
              <Text style={s.ticketDate}>{formatDate(ticket.created_at)}</Text>
            </View>

            {/* Replies */}
            {replies.map((r, idx) => {
              const isAdmin = r.sender_type === 'admin' || r.sender_type === 'support' || r.is_admin;
              return (
                <View
                  key={r.id || idx}
                  style={[
                    s.bubble,
                    isAdmin ? s.bubbleAdmin : s.bubbleDriver,
                  ]}>
                  <View style={s.bubbleHeader}>
                    <Text style={[s.bubbleSender, isAdmin && {color: colors.primary}]}>
                      {isAdmin ? t('support.supportAgent') : t('support.you')}
                    </Text>
                    <Text style={[s.bubbleTime, isAdmin && {color: colors.textMuted}]}>{formatDate(r.created_at)}</Text>
                  </View>
                  <Text style={[s.bubbleText, isAdmin && {color: colors.textPrimary}]}>
                    {r.message || r.content || r.body || ''}
                  </Text>
                </View>
              );
            })}

            {replies.length === 0 && (
              <View style={s.noReplies}>
                <Icon name="message-circle" size={28} color={colors.border} />
                <Text style={s.noRepliesText}>{t('support.noRepliesYet')}</Text>
              </View>
            )}
          </ScrollView>

          {/* Reply input */}
          {!isClosed ? (
            <View style={[s.inputBar, {paddingBottom: ins.bottom + 8}]}>
              <TextInput
                style={s.input}
                placeholder={t('support.typeReply')}
                placeholderTextColor={colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!message.trim() || isReplying) && {opacity: 0.4}]}
                disabled={!message.trim() || isReplying}
                onPress={handleSend}
                activeOpacity={0.7}>
                {isReplying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="send" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.closedBar, {paddingBottom: ins.bottom + 8}]}>
              <Icon name="lock" size={14} color={colors.textMuted} />
              <Text style={s.closedText}>{t('support.ticketClosed')}</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},

  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  hdrSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {width: 6, height: 6, borderRadius: 3},
  statusTxt: {fontFamily: fontFamily.semiBold, fontSize: 10},

  loading: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  emptyText: {fontFamily: fontFamily.medium, fontSize: 14, color: colors.textMuted},

  messages: {padding: 20, paddingBottom: 10},

  // Original ticket card
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  ticketCategoryRow: {flexDirection: 'row', marginBottom: 8},
  categoryPill: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.primary},
  ticketSubject: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary, marginBottom: 6},
  ticketDesc: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20},
  ticketDate: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textLight, marginTop: 10},

  // Chat bubbles
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  bubbleDriver: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bubbleSender: {fontFamily: fontFamily.semiBold, fontSize: 10, color: 'rgba(255,255,255,0.7)'},
  bubbleTime: {fontFamily: fontFamily.regular, fontSize: 9, color: 'rgba(255,255,255,0.5)'},
  bubbleText: {fontFamily: fontFamily.regular, fontSize: 13, color: '#FFF', lineHeight: 19},

  // No replies
  noReplies: {alignItems: 'center', paddingVertical: 30, gap: 8},
  noRepliesText: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted},

  // Reply input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
    textAlign: 'auto',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Closed bar
  closedBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    gap: 6,
  },
  closedText: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted},
});

export default TicketDetailScreen;
