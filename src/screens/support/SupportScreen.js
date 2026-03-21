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
  Platform,
} from 'react-native';
import useSupportStore from '../../store/supportStore';

const ISSUE_TYPES = [
  {label: 'Order Issue', value: 'order_issue'},
  {label: 'App Bug', value: 'app_bug'},
  {label: 'Payment Problem', value: 'payment'},
  {label: 'Navigation', value: 'navigation'},
  {label: 'Account', value: 'account'},
  {label: 'Other', value: 'other'},
];

const SupportScreen = () => {
  const {
    tickets,
    isLoadingTickets,
    isSubmitting,
    createTicket,
    fetchTickets,
    loadMoreTickets,
    resetTickets,
  } = useSupportStore();

  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('');

  useEffect(() => {
    if (tab === 'history') {
      resetTickets();
      fetchTickets({page: 1});
    }
  }, [tab]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe your issue.');
      return;
    }

    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        type: issueType || 'other',
      });
      Alert.alert('Submitted', 'Your support ticket has been created.');
      setSubject('');
      setDescription('');
      setIssueType('');
    } catch (error) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit ticket.',
      );
    }
  };

  const onRefresh = useCallback(() => {
    resetTickets();
    fetchTickets({page: 1});
  }, []);

  const renderTicket = useCallback(
    ({item}) => {
      const statusColor =
        item.status === 'open'
          ? '#F39C12'
          : item.status === 'resolved'
          ? '#27AE60'
          : '#95A5A6';
      return (
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {item.subject || 'No subject'}
            </Text>
            <View style={[styles.ticketBadge, {backgroundColor: statusColor + '20'}]}>
              <Text style={[styles.ticketBadgeText, {color: statusColor}]}>
                {(item.status || 'open').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.ticketDesc} numberOfLines={2}>
            {item.description || ''}
          </Text>
          <Text style={styles.ticketDate}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
          </Text>
        </View>
      );
    },
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'new' && styles.tabActive]}
          onPress={() => setTab('new')}>
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>
            New Ticket
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            My Tickets
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'new' ? (
        <View style={styles.form}>
          {/* Issue Type */}
          <Text style={styles.label}>Issue Type</Text>
          <View style={styles.typeRow}>
            {ISSUE_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typePill,
                  issueType === t.value && styles.typePillActive,
                ]}
                onPress={() => setIssueType(t.value)}>
                <Text
                  style={[
                    styles.typePillText,
                    issueType === t.value && styles.typePillTextActive,
                  ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief summary of your issue"
            placeholderTextColor="#999"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && {opacity: 0.5}]}
            disabled={isSubmitting}
            onPress={handleSubmit}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item, idx) => String(item.id || idx)}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoadingTickets} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreTickets}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoadingTickets ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No tickets yet</Text>
              </View>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {flex: 1, paddingVertical: 14, alignItems: 'center'},
  tabActive: {borderBottomWidth: 2, borderBottomColor: '#4A90D9'},
  tabText: {fontSize: 14, color: '#999', fontWeight: '600'},
  tabTextActive: {color: '#4A90D9'},
  form: {padding: 20},
  label: {fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 8, marginTop: 12},
  typeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4},
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typePillActive: {backgroundColor: '#4A90D9', borderColor: '#4A90D9'},
  typePillText: {fontSize: 12, color: '#666'},
  typePillTextActive: {color: '#FFF', fontWeight: '600'},
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: {minHeight: 120},
  submitBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
  list: {padding: 16, paddingBottom: 24},
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketSubject: {fontSize: 15, fontWeight: '600', color: '#1A1A2E', flex: 1, marginRight: 8},
  ticketBadge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10},
  ticketBadgeText: {fontSize: 10, fontWeight: '700'},
  ticketDesc: {fontSize: 13, color: '#666', marginBottom: 6},
  ticketDate: {fontSize: 11, color: '#999'},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: 15, color: '#999'},
});

export default SupportScreen;
