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

const RETURN_REASONS = [
  'Customer refused delivery',
  'Customer unreachable',
  'Wrong address',
  'Package damaged',
  'Customer requested return',
  'Other',
];

const ReturnOrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {orderId, orderNumber} = route.params || {};

  const {returnOrder, isActing} = useOrderStore();

  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a return reason.');
      return;
    }

    Alert.alert(
      'Confirm Return',
      `Are you sure you want to return order #${orderNumber || orderId}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Return',
          style: 'destructive',
          onPress: async () => {
            try {
              await returnOrder(orderId, {
                reason: selectedReason,
                notes: notes.trim() || undefined,
              });
              Alert.alert('Success', 'Order has been marked for return.', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error) {
              Alert.alert(
                'Error',
                error?.response?.data?.message || 'Failed to return order.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Return Order</Text>
      <Text style={styles.subtitle}>
        Order #{orderNumber || orderId}
      </Text>

      <Text style={styles.sectionTitle}>Select Return Reason</Text>
      {RETURN_REASONS.map(reason => (
        <TouchableOpacity
          key={reason}
          style={[
            styles.reasonCard,
            selectedReason === reason && styles.reasonCardSelected,
          ]}
          onPress={() => setSelectedReason(reason)}>
          <View style={styles.radio}>
            {selectedReason === reason && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.reasonText,
              selectedReason === reason && styles.reasonTextSelected,
            ]}>
            {reason}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Add any additional details..."
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
          <Text style={styles.submitBtnText}>Confirm Return</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  content: {padding: 20, paddingBottom: 40},
  title: {fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4},
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
    marginRight: 12,
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
