/**
 * Scanner Screen — Manual entry with order + package lookup
 * Supports searching by order number OR package barcode.
 * Camera-based scanning requires react-native-camera-kit (install separately).
 */

import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Vibration,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import Icon from '../../utils/LucideIcon';
import useScanStore from '../../store/scanStore';
import {packagesApi} from '../../api';
import {routeNames} from '../../constants/routeNames';
import {showMessage} from 'react-native-flash-message';

const ScannerScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const inputRef = useRef(null);
  const {scanBarcode, isScanning} = useScanStore();

  const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // ─── Unified search: try order first, then package barcode ──
  const handleSearch = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setSearching(true);
    setLastResult(null);

    // 1) Try order lookup via scan API (through store)
    try {
      const data = await scanBarcode(trimmed);
      const order = data?.order || (Array.isArray(data) ? data[0] : data);
      if (order?.id) {
        Vibration.vibrate(100);
        setLastResult({type: 'order', success: true, order});
        showMessage({message: 'Order found!', type: 'success', icon: 'auto', duration: 1500});
        setSearching(false);
        return;
      }
    } catch {
      // Not an order — continue to package lookup
    }

    // 2) Try package barcode lookup
    try {
      const pkgRes = await packagesApi.scanLookup(trimmed);
      const pkg = pkgRes.data?.data || pkgRes.data;
      if (pkg?.id) {
        Vibration.vibrate(100);
        // Log scan event
        try {
          await packagesApi.logScan(pkg.id, {scan_type: 'driver_scan'});
        } catch {}
        setLastResult({type: 'package', success: true, pkg});
        showMessage({message: 'Package found!', type: 'success', icon: 'auto', duration: 1500});
        setSearching(false);
        return;
      }
    } catch {
      // Not found as package either
    }

    Vibration.vibrate([0, 100, 50, 100]);
    setLastResult({success: false, message: 'No order or package found for this code'});
    setSearching(false);
  }, [code]);

  const goToResult = useCallback(() => {
    if (lastResult?.type === 'order' && lastResult?.order?.id) {
      navigation.navigate(routeNames.OrderDetail, {
        orderId: lastResult.order.id,
        token: lastResult.order.tracking_token,
      });
    } else if (lastResult?.type === 'package' && lastResult?.pkg) {
      const pkg = lastResult.pkg;
      // Navigate to order that contains this package
      if (pkg.order_id) {
        navigation.navigate(routeNames.OrderDetail, {
          orderId: pkg.order_id,
          token: pkg.tracking_token || pkg.order_tracking_token,
        });
      }
    }
  }, [lastResult, navigation]);

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Scanner</Text>
        <View style={{width: 20}} />
      </View>

      {mode === 'scan' ? (
        /* ─── Camera Viewfinder (placeholder) ─── */
        <View style={s.body}>
          <View style={s.frame}>
            <Icon name="barcode-scan" size={48} color={colors.success} />
          </View>
          <Text style={s.hint}>Point your camera at a barcode or QR code</Text>
          <Text style={s.subHint}>
            Camera scanning requires additional setup.{'\n'}Use manual entry below for now.
          </Text>
        </View>
      ) : (
        /* ─── Manual Entry ────────────────────── */
        <View style={s.manualBody}>
          <View style={s.searchRow}>
            <View style={s.inputWrap}>
              <Icon name="magnify" size={18} color={colors.textMuted} />
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder="Order # or package barcode..."
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {code.length > 0 && (
                <TouchableOpacity onPress={() => setCode('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[s.searchBtn, !code.trim() && {opacity: 0.5}]}
              onPress={handleSearch}
              disabled={!code.trim() || searching}
              activeOpacity={0.7}>
              {searching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon name="arrow-right" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Result */}
          {lastResult && (
            <View style={[s.resultCard, {borderColor: lastResult.success ? colors.success : colors.danger}]}>
              <Icon
                name={lastResult.success
                  ? lastResult.type === 'package' ? 'package-variant' : 'check-circle-outline'
                  : 'alert-circle-outline'}
                size={22}
                color={lastResult.success ? colors.success : colors.danger}
              />
              <View style={{flex: 1}}>
                {lastResult.success && lastResult.type === 'order' ? (
                  <>
                    <Text style={s.resultTitle}>
                      {lastResult.order.order_number || lastResult.order.tracking_token}
                    </Text>
                    <Text style={s.resultSub}>
                      Order · {(lastResult.order.status || '').replace(/_/g, ' ')}
                    </Text>
                  </>
                ) : lastResult.success && lastResult.type === 'package' ? (
                  <>
                    <Text style={s.resultTitle}>
                      {lastResult.pkg.barcode || lastResult.pkg.id}
                    </Text>
                    <Text style={s.resultSub}>
                      Package · {lastResult.pkg.recipient_name || '---'} · {(lastResult.pkg.status || '').replace(/_/g, ' ')}
                    </Text>
                  </>
                ) : (
                  <Text style={s.resultTitle}>{lastResult.message}</Text>
                )}
              </View>
              {lastResult.success && (
                <TouchableOpacity style={s.goBtn} onPress={goToResult} activeOpacity={0.7}>
                  <Text style={s.goBtnTxt}>View</Text>
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Search tip */}
          {!lastResult && (
            <View style={s.tipWrap}>
              <Icon name="information-outline" size={16} color={colors.textMuted} />
              <Text style={s.tipTxt}>
                Enter an order tracking number or package barcode to search.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom – Mode Toggle */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 14}]}>
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, mode === 'scan' && s.tabActive]}
            onPress={() => setMode('scan')}
            activeOpacity={0.7}>
            <Icon name="camera-outline" size={18} color={mode === 'scan' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
            <Text style={[s.tabTxt, mode === 'scan' && s.tabTxtActive]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, mode === 'manual' && s.tabActive]}
            onPress={() => {
              setMode('manual');
              setTimeout(() => inputRef.current?.focus(), 300);
            }}
            activeOpacity={0.7}>
            <Icon name="keyboard-outline" size={18} color={mode === 'manual' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
            <Text style={[s.tabTxt, mode === 'manual' && s.tabTxtActive]}>Manual</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#1A1A2E'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: '#FFF'},

  /* Camera body */
  body: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  frame: {
    width: 200, height: 200,
    borderWidth: 2, borderColor: colors.success, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  hint: {
    fontFamily: fontFamily.regular, fontSize: 13, color: 'rgba(255,255,255,0.6)',
    marginTop: 20, textAlign: 'center', paddingHorizontal: 24,
  },
  subHint: {
    fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.35)',
    marginTop: 8, textAlign: 'center', paddingHorizontal: 24, lineHeight: 16,
  },

  /* Manual body */
  manualBody: {flex: 1, paddingHorizontal: 20, paddingTop: 24},
  searchRow: {flexDirection: 'row', gap: 10},
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 14, gap: 10, height: 48,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  input: {
    flex: 1, fontFamily: fontFamily.medium, fontSize: 14, color: '#FFF',
    paddingVertical: 0,
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },

  /* Result */
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    padding: 16, marginTop: 20,
    borderWidth: 1,
  },
  resultTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: '#FFF'},
  resultSub: {fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2},
  goBtn: {flexDirection: 'row', alignItems: 'center', gap: 2},
  goBtnTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.primary},

  /* Tip */
  tipWrap: {
    flexDirection: 'row', gap: 8, marginTop: 24, paddingHorizontal: 4, alignItems: 'flex-start',
  },
  tipTxt: {fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1, lineHeight: 17},

  /* Bottom tabs */
  bottom: {paddingHorizontal: 20},
  tabRow: {flexDirection: 'row', gap: 10},
  tabBtn: {
    flex: 1, height: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 8,
  },
  tabActive: {backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.3)'},
  tabTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.5)'},
  tabTxtActive: {color: '#FFF'},
});

export default ScannerScreen;
