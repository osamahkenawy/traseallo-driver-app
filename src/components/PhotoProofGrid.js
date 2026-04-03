/**
 * PhotoProofGrid — Multi-photo capture & display grid
 *
 * Features:
 *   - Fetch existing photos on mount
 *   - Camera capture with photo_type + optional caption
 *   - Thumbnail grid with delete (✕)
 *   - Counter badge (count / limit)
 *   - Enforces tenant photo_capture_limit
 *   - Attaches GPS coords automatically
 *   - Works for both order-level and stop-level
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from '../utils/LucideIcon';
import {colors} from '../theme/colors';
import {fontFamily, fontSize} from '../theme/fonts';
import {uploadsApi} from '../api';
import useLocationStore from '../store/locationStore';
import useSettingsStore from '../store/settingsStore';

const PHOTO_TYPES = [
  {value: 'proof_of_delivery', labelKey: 'photoProof.proofOfDelivery'},
  {value: 'pickup_proof', labelKey: 'photoProof.pickupProof'},
  {value: 'damage', labelKey: 'photoProof.damage'},
  {value: 'other', labelKey: 'photoProof.other'},
];

const PhotoProofGrid = ({
  orderId,
  stopId,
  t,
  onPhotosChange,
}) => {
  const [photos, setPhotos] = useState([]);
  const [limit, setLimit] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [caption, setCaption] = useState('');
  const [selectedType, setSelectedType] = useState('proof_of_delivery');
  const currentPosition = useLocationStore(s => s.currentPosition);
  const photoCaptureLimit = useSettingsStore(s => s.photoCaptureLimit);
  const maxPhotoSizeMb = useSettingsStore(s => s.maxPhotoSizeMb);

  const count = photos.length;
  const canAdd = count < limit;

  // Fetch existing photos on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = stopId
          ? await uploadsApi.getStopPhotos(stopId)
          : await uploadsApi.getOrderPhotos(orderId);
        if (cancelled) return;
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.photos || [];
        const serverLimit = res.data?.limit ?? data?.limit ?? photoCaptureLimit;
        setPhotos(list);
        setLimit(serverLimit);
        onPhotosChange?.(list);
      } catch {
        // Couldn't load — start empty
        setLimit(photoCaptureLimit);
      }
    };
    if (orderId || stopId) load();
    return () => { cancelled = true; };
  }, [orderId, stopId]);

  // Launch camera
  const handleCapture = useCallback(() => {
    if (!canAdd) {
      Alert.alert(
        t('photoProof.limitReached'),
        t('photoProof.limitReachedDesc', {limit}),
      );
      return;
    }
    const pickerOptions = {
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1600,
        maxHeight: 1600,
      };
    const handleResponse = (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;
        // Validate file size
        const sizeMb = (asset.fileSize || 0) / (1024 * 1024);
        if (sizeMb > maxPhotoSizeMb) {
          Alert.alert(
            t('photoProof.fileTooLarge'),
            t('photoProof.fileTooLargeDesc', {max: maxPhotoSizeMb}),
          );
          return;
        }
        setPendingUri(asset.uri);
        setCaption('');
        setSelectedType('proof_of_delivery');
        setShowTypePicker(true);
      };
    // Try camera first; if it fails (e.g. simulator), offer gallery picker
    launchCamera(
      {...pickerOptions, cameraType: 'back'},
      (res) => {
        if (res.errorCode === 'camera_unavailable') {
          launchImageLibrary(pickerOptions, handleResponse);
        } else {
          handleResponse(res);
        }
      },
    );
  }, [canAdd, limit, maxPhotoSizeMb, t]);

  // Upload after type selection
  const handleUpload = useCallback(async () => {
    if (!pendingUri) return;
    setShowTypePicker(false);
    setUploading(true);
    try {
      const meta = {
        photo_type: selectedType,
        caption: caption.trim() || undefined,
        lat: currentPosition?.latitude,
        lng: currentPosition?.longitude,
      };
      const res = stopId
        ? await uploadsApi.uploadStopProofPhoto(stopId, pendingUri, meta)
        : await uploadsApi.uploadOrderProofPhoto(orderId, pendingUri, meta);
      const data = res.data?.data || res.data;
      const updatedPhotos = data?.photos || [...photos, {
        id: data?.id || Date.now(),
        photo_url: data?.url,
        photo_type: selectedType,
        caption: caption.trim(),
      }];
      const serverLimit = data?.limit ?? limit;
      setPhotos(updatedPhotos);
      setLimit(serverLimit);
      onPhotosChange?.(updatedPhotos);
    } catch (e) {
      const msg = e?.response?.data?.message || t('photoProof.uploadFailed');
      // Handle limit reached from server
      if (e?.response?.status === 403) {
        Alert.alert(t('photoProof.limitReached'), msg);
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setUploading(false);
      setPendingUri(null);
    }
  }, [pendingUri, selectedType, caption, stopId, orderId, currentPosition, photos, limit, t]);

  // Delete photo
  const handleDelete = useCallback(async (photoId) => {
    Alert.alert(t('photoProof.deleteTitle'), t('photoProof.deleteConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(photoId);
          try {
            await uploadsApi.deletePhoto(photoId);
            const updated = photos.filter(p => p.id !== photoId);
            setPhotos(updated);
            onPhotosChange?.(updated);
          } catch {
            Alert.alert(t('common.error'), t('photoProof.deleteFailed'));
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }, [photos, t]);

  const getTypeLabel = (value) => {
    const item = PHOTO_TYPES.find(pt => pt.value === value);
    return item ? t(item.labelKey) : value;
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Icon name="camera-outline" size={16} color={colors.primary} />
          <Text style={s.headerLabel}>{t('photoProof.title')}</Text>
        </View>
        <View style={s.counterBadge}>
          <Text style={s.counterText}>{count}/{limit}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={s.grid}>
        {photos.map((photo, idx) => {
          const uri = photo.photo_url?.startsWith('/')
            ? uploadsApi.getFileUrl(photo.photo_url)
            : photo.photo_url;
          const isDeleting = deleting === photo.id;
          return (
            <View key={`photo-${photo.id}-${idx}`} style={s.thumbWrap}>
              <Image source={{uri}} style={s.thumb} resizeMode="cover" />
              {photo.photo_type && photo.photo_type !== 'proof_of_delivery' && (
                <View style={s.typeBadge}>
                  <Text style={s.typeBadgeText} numberOfLines={1}>
                    {getTypeLabel(photo.photo_type)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDelete(photo.id)}
                disabled={isDeleting}
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Icon name="close" size={12} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add button */}
        {canAdd && (
          <TouchableOpacity
            style={s.addBtn}
            onPress={handleCapture}
            disabled={uploading}
            activeOpacity={0.7}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Icon name="camera-plus-outline" size={22} color={colors.primary} />
                <Text style={s.addLabel}>{t('photoProof.add')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {!canAdd && count > 0 && (
        <Text style={s.limitText}>
          {t('photoProof.limitReachedShort', {limit})}
        </Text>
      )}

      {/* Photo type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('photoProof.selectType')}</Text>

            {PHOTO_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt.value}
                style={[s.typeOption, selectedType === pt.value && s.typeOptionActive]}
                onPress={() => setSelectedType(pt.value)}
                activeOpacity={0.7}>
                <View style={[s.typeRadio, selectedType === pt.value && s.typeRadioActive]} />
                <Text style={[s.typeLabel, selectedType === pt.value && s.typeLabelActive]}>
                  {t(pt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={s.captionLabel}>{t('photoProof.caption')}</Text>
            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={(v) => setCaption(v.slice(0, 255))}
              placeholder={t('photoProof.captionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={255}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => {
                  setShowTypePicker(false);
                  setPendingUri(null);
                }}>
                <Text style={s.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={handleUpload}>
                <Text style={s.modalConfirmText}>{t('photoProof.upload')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const THUMB_SIZE = 88;

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginStart: 8,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  counterBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    marginEnd: 10,
    marginBottom: 10,
    backgroundColor: colors.bgGray,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 8,
    color: colors.white,
    textAlign: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
    marginBottom: 10,
  },
  addLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.primary,
    marginTop: 4,
  },
  limitText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -4,
    marginBottom: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 14,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  typeOptionActive: {
    backgroundColor: colors.primary + '0D',
  },
  typeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginEnd: 12,
  },
  typeRadioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  typeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  typeLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  captionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  captionInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 12,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginEnd: 8,
  },
  modalCancelText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  modalConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.white,
  },
});

export default React.memo(PhotoProofGrid);
