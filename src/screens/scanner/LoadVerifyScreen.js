/**
 * LoadVerifyScreen — Load verification scan
 * Scan packages against assigned order manifest before starting trip
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {showMessage} from 'react-native-flash-message';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {ordersApi, packagesApi} from '../../api';

const LoadVerifyScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const inputRef = useRef(null);

  // ─── State ─────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [expectedPackages, setExpectedPackages] = useState([]);
  const [scannedIds, setScannedIds] = useState(new Set());
  const [unexpectedScans, setUnexpectedScans] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'scanned' | 'missing' | 'unexpected'

  // ─── Load expected packages from active orders ──
  useEffect(() => {
    const loadManifest = async () => {
      try {
        const res = await ordersApi.getOrders({status: 'active'});
        const data = res.data?.data || res.data;
        const orders = data?.orders || data || [];

        const allPkgs = [];
        for (const order of orders) {
          if (!order.id) continue;
          try {
            const pkgRes = await packagesApi.getOrderPackages(order.id);
            const pkgData = pkgRes.data?.data || pkgRes.data;
            const pkgs = Array.isArray(pkgData?.packages) ? pkgData.packages
              : Array.isArray(pkgData) ? pkgData : [];
            const relevantPkgs = pkgs.filter(p =>
              ['assigned', 'picked_up', 'created', 'warehouse_in'].includes(p.status),
            );
            relevantPkgs.forEach(p => {
              allPkgs.push({
                ...p,
                order_number: order.order_number,
                order_id: order.id,
              });
            });
          } catch {
            // skip orders with no packages
          }
        }
        setExpectedPackages(allPkgs);
      } catch (err) {
        showMessage({message: 'Failed to load manifest', type: 'danger', icon: 'auto'});
      } finally {
        setLoading(false);
      }
    };
    loadManifest();
  }, []);

  // ─── Scan handler ──────────────────────────────
  const handleScan = useCallback(async () => {
    const code = barcode.trim();
    if (!code) return;
    setScanning(true);
    try {
      const res = await packagesApi.scanLookup(code);
      const pkg = res.data?.data || res.data;

      if (!pkg || !pkg.id) {
        Vibration.vibrate([0, 100, 50, 100]);
        showMessage({message: 'Package not found', type: 'danger', icon: 'auto'});
        setScanning(false);
        return;
      }

      // Check if in expected list
      const expected = expectedPackages.find(
        p => p.id === pkg.id || p.barcode === code,
      );

      if (expected) {
        // Match! Log pickup scan
        try {
          await packagesApi.logScan(pkg.id, {scan_type: 'pickup_scan'});
        } catch {
          // scan log failure shouldn't block verification
        }
        Vibration.vibrate(100);
        setScannedIds(prev => new Set([...prev, expected.id]));
        showMessage({
          message: `Verified: ${code}`,
          description: `${pkg.recipient_name || ''} — ${pkg.order_number || ''}`,
          type: 'success',
          icon: 'auto',
          duration: 1500,
        });
      } else {
        // Unexpected package
        Vibration.vibrate([0, 100, 50, 100]);
        setUnexpectedScans(prev => {
          if (prev.find(u => u.id === pkg.id)) return prev;
          return [...prev, {...pkg, barcode: code}];
        });
        showMessage({
          message: `Unexpected: ${code}`,
          description: 'Not in your assigned orders',
          type: 'warning',
          icon: 'auto',
          duration: 2000,
        });
      }
    } catch (err) {
      Vibration.vibrate([0, 100, 50, 100]);
      showMessage({
        message: 'Scan failed',
        description: err?.response?.data?.message || 'Package not found',
        type: 'danger',
        icon: 'auto',
      });
    } finally {
      setBarcode('');
      setScanning(false);
      inputRef.current?.focus();
    }
  }, [barcode, expectedPackages]);

  // ─── Complete load ─────────────────────────────
  const handleComplete = async () => {
    const missing = expectedPackages.filter(p => !scannedIds.has(p.id));
    if (missing.length > 0) {
      Alert.alert(
        'Missing Packages',
        `${missing.length} package(s) haven't been scanned. Complete anyway?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Complete',
            onPress: async () => {
              await finishLoad();
            },
          },
        ],
      );
    } else {
      await finishLoad();
    }
  };

  const finishLoad = async () => {
    setCompleting(true);
    try {
      // Batch-log pickup_scan for any scanned packages that weren't already logged
      // (the individual scan already logged, but this ensures completeness)
      const scannedArr = expectedPackages.filter(p => scannedIds.has(p.id));
      let loggedCount = 0;
      for (const pkg of scannedArr) {
        try {
          await packagesApi.logScan(pkg.id, {scan_type: 'load_verify'});
          loggedCount++;
        } catch {
          // Individual log failure shouldn't block
        }
      }

      showMessage({
        message: 'Load verification complete!',
        description: `${scannedIds.size}/${expectedPackages.length} packages verified, ${loggedCount} scans logged`,
        type: 'success',
        icon: 'auto',
        duration: 3000,
      });
      setTimeout(() => navigation.goBack(), 500);
    } finally {
      setCompleting(false);
    }
  };

  // ─── Derived data ─────────────────────────────
  const scannedPackages = expectedPackages.filter(p => scannedIds.has(p.id));
  const missingPackages = expectedPackages.filter(p => !scannedIds.has(p.id));

  const filteredList =
    tab === 'scanned' ? scannedPackages :
    tab === 'missing' ? missingPackages :
    tab === 'unexpected' ? unexpectedScans :
    expectedPackages;

  if (loading) {
    return (
      <View style={[s.root, {paddingTop: ins.top, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadTxt}>Loading manifest...</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hdrBack}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text style={s.hdrTitle}>Load Verification</Text>
          <Text style={s.hdrSub}>{expectedPackages.length} packages expected</Text>
        </View>
        <View style={{width: 36}} />
      </View>

      {/* Progress Bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBar}>
          <View
            style={[
              s.progressFill,
              {
                width: expectedPackages.length > 0
                  ? `${(scannedIds.size / expectedPackages.length) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={s.progressTxt}>
          {scannedIds.size}/{expectedPackages.length} scanned
        </Text>
      </View>

      {/* Scan Input */}
      <View style={s.scanRow}>
        <View style={s.inputWrap}>
          <Icon name="barcode-scan" size={18} color={colors.primary} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Scan or enter barcode..."
            placeholderTextColor={colors.textMuted}
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleScan}
            autoFocus
          />
          {barcode.length > 0 && (
            <TouchableOpacity onPress={() => setBarcode('')}>
              <Icon name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.scanBtn, (!barcode.trim() || scanning) && {opacity: 0.5}]}
          onPress={handleScan}
          disabled={!barcode.trim() || scanning}
          activeOpacity={0.7}>
          {scanning ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="arrow-right" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[
          {key: 'all', label: 'All', count: expectedPackages.length, color: colors.primary},
          {key: 'scanned', label: 'Scanned', count: scannedPackages.length, color: colors.success},
          {key: 'missing', label: 'Missing', count: missingPackages.length, color: colors.danger},
          {key: 'unexpected', label: 'Extra', count: unexpectedScans.length, color: colors.warning},
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && {borderColor: t.color, backgroundColor: t.color + '10'}]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}>
            <Text style={[s.tabCount, {color: tab === t.key ? t.color : colors.textMuted}]}>
              {t.count}
            </Text>
            <Text style={[s.tabLabel, {color: tab === t.key ? t.color : colors.textMuted}]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Package List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Icon name="package-variant-closed" size={32} color={colors.textLight} />
            <Text style={s.emptyTxt}>
              {tab === 'scanned' ? 'No packages scanned yet' :
               tab === 'unexpected' ? 'No unexpected scans' :
               tab === 'missing' ? 'All packages scanned!' :
               'No packages to verify'}
            </Text>
          </View>
        }
        renderItem={({item}) => {
          const isScanned = scannedIds.has(item.id);
          const isUnexpected = tab === 'unexpected';
          return (
            <View style={[s.pkgCard, isScanned && s.pkgScanned, isUnexpected && s.pkgUnexpected]}>
              <View style={[
                s.pkgIc,
                {backgroundColor: isScanned ? colors.successBg : isUnexpected ? colors.warningBg : '#F5F7FA'},
              ]}>
                <Icon
                  name={isScanned ? 'check-circle' : isUnexpected ? 'alert-circle' : 'package-variant-closed'}
                  size={18}
                  color={isScanned ? colors.success : isUnexpected ? colors.warning : colors.textMuted}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={s.pkgBarcode}>{item.barcode || 'No barcode'}</Text>
                <Text style={s.pkgInfo}>
                  {item.recipient_name || '---'} · {item.order_number || ''}
                </Text>
              </View>
              {isScanned && <Icon name="check" size={16} color={colors.success} />}
              {isUnexpected && <Icon name="alert" size={16} color={colors.warning} />}
            </View>
          );
        }}
      />

      {/* Bottom */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.completeBtn, completing && {opacity: 0.6}]}
          onPress={handleComplete}
          disabled={completing}
          activeOpacity={0.75}>
          {completing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="check-all" size={18} color="#FFF" />
          )}
          <Text style={s.completeTxt}>
            {completing ? 'Completing...' : `Complete Load (${scannedIds.size}/${expectedPackages.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  loadTxt: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted, marginTop: 10},
  hdr: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52,
  },
  hdrBack: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary},
  hdrSub: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginTop: 1},

  /* Progress */
  progressWrap: {paddingHorizontal: 20, marginBottom: 12},
  progressBar: {
    height: 8, backgroundColor: '#E0E4EA', borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: {height: '100%', backgroundColor: colors.success, borderRadius: 4},
  progressTxt: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textPrimary, textAlign: 'center'},

  /* Scan Input */
  scanRow: {flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12},
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 14, gap: 10, height: 48,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  input: {
    flex: 1, fontFamily: fontFamily.medium, fontSize: 14, color: colors.textPrimary, paddingVertical: 0,
  },
  scanBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },

  /* Tabs */
  tabRow: {flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12},
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#EEF1F5', backgroundColor: '#FFF',
  },
  tabCount: {fontFamily: fontFamily.bold, fontSize: 16},
  tabLabel: {fontFamily: fontFamily.medium, fontSize: 9, marginTop: 1},

  /* List */
  list: {paddingHorizontal: 20, paddingBottom: 100},
  emptyWrap: {alignItems: 'center', paddingTop: 40, gap: 10},
  emptyTxt: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted},

  /* Package card */
  pkgCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#EEF1F5', gap: 12,
  },
  pkgScanned: {borderColor: colors.success + '40', backgroundColor: colors.successBg},
  pkgUnexpected: {borderColor: colors.warning + '40', backgroundColor: colors.warningBg},
  pkgIc: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  pkgBarcode: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary},
  pkgInfo: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: -4}},
      android: {elevation: 8},
    }),
  },
  completeBtn: {
    height: 50, backgroundColor: colors.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  completeTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default LoadVerifyScreen;
