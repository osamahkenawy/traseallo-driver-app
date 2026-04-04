/**
 * Trasealla Driver App — Return Order Screen
 * Allows driver to return an order with reason and optional photo
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import useOrderStore from '../../store/orderStore';
import {useTranslation} from 'react-i18next';

const RETURN_REASONS = [
  {value: 'customer_request', labelKey: 'returnOrder.customerRequest'},
  {value: 'wrong_item', labelKey: 'returnOrder.wrongItem'},
  {value: 'damaged', labelKey: 'returnOrder.damaged'},
  {value: 'other', labelKey: 'returnOrder.other'},
];

const ReturnOrderScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {orderId, orderNumber} = route.params || {};

  const {returnOrder, isActing} = useOrderStore();

  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert(t('returnOrder.error'), t('returnOrder.selectReason'));
      return;
    }
    if (!orderId) {
      Alert.alert(t('returnOrder.error'), t('returnOrder.noOrderId', 'Order ID is missing'));
      return;
    }

    Alert.alert(
      t('returnOrder.confirmReturn'),
      `${t('returnOrder.title')} #${orderNumber || orderId}?`,
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('returnOrder.confirmReturn'),
          style: 'destructive',
          onPress: async () => {
            try {
              await returnOrder(orderId, {
                reason: selectedReason,
                notes: notes.trim() || undefined,
              });
              Alert.alert(t('returnOrder.success'), t('returnOrder.successDesc'), [
                {text: t('common.done'), onPress: () => navigation.goBack()},
              ]);
            } catch (error) {
              Alert.alert(
                t('returnOrder.error'),
                error?.response?.data?.message || t('returnOrder.failedToReturn'),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('returnOrder.title')}</Text>
      <Text style={styles.subtitle}>
        {t('dashboard.order')} #{orderNumber || orderId}
      </Text>

      <Text style={styles.sectionTitle}>{t('returnOrder.selectReason')}</Text>
      {RETURN_REASONS.map(reason => {
        const label = t(reason.labelKey);
        return (
        <TouchableOpacity
          key={reason.value}
          style={[
            styles.reasonCard,
            selectedReason === reason.value && styles.reasonCardSelected,
          ]}
          onPress={() => setSelectedReason(reason.value)}>
          <View style={styles.radio}>
            {selectedReason === reason.value && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.reasonText,
              selectedReason === reason.value && styles.reasonTextSelected,
            ]}>
            {label}
          </Text>
        </TouchableOpacity>
        );
      })}

      <Text style={styles.sectionTitle}>{t('returnOrder.addNotes')}</Text>
      <TextInput
        style={styles.textArea}
        placeholder={t('returnOrder.addNotes')}
        placeholderTextColor="#999"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity
        style={[styles.submitBtn, (!selectedReason || isActing) && styles.submitBtnDisabled]}
        disabled={!selectedReason || isActing}
        onPress={handleSubmit}>
        {isActing ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>{t('returnOrder.confirmReturn')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  content: {padding: 20, paddingBottom: 40},
  title: {fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4, textAlign: 'auto'},
  subtitle: {fontSize: 14, color: '#666', marginBottom: 24},
  sectionTitle: {fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 12, marginTop: 8},
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  reasonCardSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#EBF3FC',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90D9',
  },
  reasonText: {fontSize: 14, color: '#333', flex: 1},
  reasonTextSelected: {color: '#4A90D9', fontWeight: '600'},
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {opacity: 0.5},
  submitBtnText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
});

export default ReturnOrderScreen;
