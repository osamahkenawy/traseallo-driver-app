/**
 * NotificationsPreview — Small preview of latest unread notifications
 * Shows 2-3 latest items with "View All" link
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const NOTIF_ICONS = {
  order_assigned: {icon: 'package-variant', color: '#244066'},
  order_delivered: {icon: 'check-decagram', color: '#15C7AE'},
  order_failed: {icon: 'close-circle-outline', color: '#EB466D'},
  cod_pending: {icon: 'cash-clock', color: '#F9AD28'},
  pickup: {icon: 'truck-delivery', color: '#4E7AB5'},
  support: {icon: 'headset', color: '#9261C6'},
  default: {icon: 'bell-outline', color: colors.primary},
};

const getNotifIcon = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.default;

const NotificationsPreview = ({
  notifications = [],
  unreadCount = 0,
  onViewAll,
  onPress,
}) => {
  const {t} = useTranslation();

  if (unreadCount === 0 && notifications.length === 0) return null;

  return (
    <View style={$.root}>
      <View style={$.header}>
        <Text style={$.sectionTitle}>{t('dashboard.notifications')}</Text>
        {unreadCount > 0 && (
          <View style={$.countBadge}>
            <Text style={$.countTxt}>{unreadCount}</Text>
          </View>
        )}
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} style={$.viewAllBtn}>
          <Text style={$.viewAll}>{t('dashboard.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      <View style={$.card}>
        {notifications.slice(0, 3).map((notif, idx) => {
          const iconCfg = getNotifIcon(notif.type);
          return (
            <TouchableOpacity
              key={`notif-${notif.id || idx}-${idx}`}
              style={[$.notifItem, idx < notifications.length - 1 && idx < 2 && $.notifBorder]}
              onPress={() => onPress?.(notif)}
              activeOpacity={0.6}>
              <View style={[$.notifIcon, {backgroundColor: iconCfg.color + '12'}]}>
                <Icon name={iconCfg.icon} size={16} color={iconCfg.color} />
              </View>
              <View style={$.notifBody}>
                <Text style={$.notifTitle} numberOfLines={1}>
                  {notif.title || t('dashboard.notificationFallback')}
                </Text>
                <Text style={$.notifSub} numberOfLines={1}>
                  {notif.body || notif.message || ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textLight} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#FFF',
  },
  viewAllBtn: {
    marginStart: 'auto',
  },
  viewAll: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  notifBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBody: {flex: 1},
  notifTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  notifSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default React.memo(NotificationsPreview);
