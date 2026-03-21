/**
 * Trasealla Driver App — Help Screen
 * FAQ and help content from backend
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import useSupportStore from '../../store/supportStore';
import {routeNames} from '../../constants/routeNames';

const HelpScreen = () => {
  const navigation = useNavigation();
  const {help, isLoading, fetchHelp} = useSupportStore();
  const [expandedIdx, setExpandedIdx] = useState(null);

  useEffect(() => {
    fetchHelp();
  }, []);

  const onRefresh = useCallback(() => fetchHelp(), []);

  const faqs = help?.faqs || help?.items || [];
  const contactInfo = help?.contact || null;

  const toggleFaq = idx => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  if (isLoading && !help) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Help & FAQ</Text>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.faqCard}
              activeOpacity={0.7}
              onPress={() => toggleFaq(idx)}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>
                  {faq.question || faq.title || `Question ${idx + 1}`}
                </Text>
                <Text style={styles.faqChevron}>
                  {expandedIdx === idx ? '▲' : '▼'}
                </Text>
              </View>
              {expandedIdx === idx && (
                <Text style={styles.faqAnswer}>
                  {faq.answer || faq.content || 'No answer available.'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contact Section */}
      {contactInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactCard}>
            {contactInfo.phone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${contactInfo.phone}`)}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{contactInfo.phone}</Text>
              </TouchableOpacity>
            )}
            {contactInfo.email && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${contactInfo.email}`)}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{contactInfo.email}</Text>
              </TouchableOpacity>
            )}
            {contactInfo.whatsapp && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`,
                  )
                }>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>{contactInfo.whatsapp}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Support Ticket CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => navigation.navigate(routeNames.Support)}>
        <Text style={styles.ctaBtnText}>Create Support Ticket</Text>
      </TouchableOpacity>

      {faqs.length === 0 && !contactInfo && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No help content available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  content: {padding: 20, paddingBottom: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 20},
  section: {marginBottom: 24},
  sectionTitle: {fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 12},
  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {fontSize: 14, fontWeight: '600', color: '#333', flex: 1, marginRight: 8},
  faqChevron: {fontSize: 12, color: '#999'},
  faqAnswer: {fontSize: 13, color: '#666', lineHeight: 20, marginTop: 10},
  contactCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  contactLabel: {fontSize: 13, color: '#999'},
  contactValue: {fontSize: 14, fontWeight: '600', color: '#4A90D9'},
  ctaBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaBtnText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
  empty: {alignItems: 'center', paddingTop: 40},
  emptyText: {fontSize: 15, color: '#999'},
});

export default HelpScreen;
