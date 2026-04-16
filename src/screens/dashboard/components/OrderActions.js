/**
 * OrderActions — Accept / Reject buttons with loading + disabled states.
 * Prevents double-tap via internal busy flag.
 */

import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import {CheckCircle, XCircle} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';
import {borderRadius} from '../../../theme/borderRadius';

const OrderActions = ({onAccept, onReject, t}) => {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const busy = accepting || rejecting;

  const handleAccept = useCallback(async () => {
    if (busy) return;
    setAccepting(true);
    try {
      await onAccept?.();
    } finally {
      setAccepting(false);
    }
  }, [busy, onAccept]);

  const handleReject = useCallback(async () => {
    if (busy) return;
    setRejecting(true);
    try {
      await onReject?.();
    } finally {
      setRejecting(false);
    }
  }, [busy, onReject]);

  return (
    <View>
      <View style={$.separator} />
      <View style={$.row}>
        {/* Reject */}
        <TouchableOpacity
          style={[$.rejectBtn, busy && $.disabled]}
          onPress={handleReject}
          disabled={busy}
          activeOpacity={0.7}>
          {rejecting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <XCircle size={16} color={colors.danger} strokeWidth={2} style={{marginRight: 8}} />
              <Text style={$.rejectTxt}>{t('dashboard.reject', 'Reject')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Accept */}
        <TouchableOpacity
          style={[$.acceptBtn, busy && $.disabled]}
          onPress={handleAccept}
          disabled={busy}
          activeOpacity={0.7}>
          {accepting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <CheckCircle size={16} color="#FFF" strokeWidth={2} style={{marginRight: 8}} />
              <Text style={$.acceptTxt}>{t('dashboard.accept', 'Accept')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  rejectBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    backgroundColor: colors.danger + '06',
    borderColor: colors.danger + '20',
    marginRight: 12,
  },
  rejectTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.danger,
  },
  acceptBtn: {
    flex: 1.4,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: '#244066',
    shadowColor: '#244066',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  acceptTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: '#FFF',
  },
});

export default React.memo(OrderActions);
