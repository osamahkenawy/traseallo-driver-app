/**
 * SignaturePad — Premium signature capture using react-native-signature-canvas
 * Compact, branded, smooth canvas with clear/save and base64 export.
 */

import React, {useRef, useImperativeHandle, forwardRef, useState} from 'react';
import {View, Text, TouchableOpacity, Image, StyleSheet, Platform} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import {colors} from '../theme/colors';
import {fontFamily} from '../theme/fonts';

const WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--body canvas {
    border-radius: 12px;
    background-color: #FAFBFC;
  }
  .m-signature-pad--footer { display: none; }
  body, html { background: transparent; margin: 0; padding: 0; }
`;

const SignaturePad = forwardRef(
  ({style, onStrokeEnd, onExport, onClear, height = 220}, ref) => {
    const sigRef = useRef(null);
    const [hasStrokes, setHasStrokes] = useState(false);
    const [preview, setPreview] = useState(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigRef.current?.clearSignature();
        setHasStrokes(false);
        setPreview(null);
        onClear?.();
      },
      exportSignature: () => {
        if (!hasStrokes) {
          onExport?.(null);
          return;
        }
        sigRef.current?.readSignature();
      },
      resetPreview: () => setPreview(null),
      getHasStrokes: () => hasStrokes,
    }));

    const handleEnd = () => {
      setHasStrokes(true);
      onStrokeEnd?.(true);
    };

    const handleOK = (dataUrl) => {
      setPreview(dataUrl);
      onExport?.(dataUrl);
    };

    const handleEmpty = () => {
      onExport?.(null);
    };

    const handleClear = () => {
      sigRef.current?.clearSignature();
      setHasStrokes(false);
      setPreview(null);
      onClear?.();
    };

    if (preview) {
      return (
        <View style={[styles.container, style]}>
          <View style={[styles.previewCard, {height}]}>
            <Image
              source={{uri: preview}}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>Captured</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={handleClear}
            activeOpacity={0.7}>
            <Text style={styles.retakeTxt}>Retake Signature</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <View style={[styles.canvasCard, {height}]}>
          {/* Signature line */}
          <View style={styles.signatureLine} />
          <Text style={styles.signHereLabel}>Sign here</Text>

          <SignatureCanvas
            ref={sigRef}
            onEnd={handleEnd}
            onOK={handleOK}
            onEmpty={handleEmpty}
            webStyle={WEB_STYLE}
            backgroundColor="rgba(250,251,252,0)"
            penColor={colors.primary}
            minWidth={1.5}
            maxWidth={3}
            dotSize={2}
            trimWhitespace={false}
            style={styles.canvas}
          />
        </View>

        {/* Inline actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.clearChip, !hasStrokes && styles.clearChipDisabled]}
            onPress={handleClear}
            disabled={!hasStrokes}
            activeOpacity={0.7}>
            <Text style={styles.clearChipIcon}>✕</Text>
            <Text
              style={[
                styles.clearChipTxt,
                !hasStrokes && styles.clearChipTxtDisabled,
              ]}>
              Clear
            </Text>
          </TouchableOpacity>

          <View style={styles.statusDot}>
            <View
              style={[
                styles.dot,
                {backgroundColor: hasStrokes ? colors.success : '#D0D5DD'},
              ]}
            />
            <Text style={styles.statusTxt}>
              {hasStrokes ? 'Signature captured' : 'Awaiting signature'}
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

const styles = StyleSheet.create({
  container: {},

  /* Canvas card */
  canvasCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E4E8EE',
    borderStyle: 'dashed',
    backgroundColor: '#FAFBFC',
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 44,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: '#D0D5DD',
    zIndex: 10,
  },
  signHereLabel: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#B0B7C3',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    zIndex: 10,
  },

  /* Actions row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FEF3F2',
  },
  clearChipDisabled: {
    backgroundColor: '#F2F4F7',
  },
  clearChipIcon: {
    fontSize: 12,
    color: '#EB466D',
    marginRight: 5,
    fontFamily: fontFamily.bold,
  },
  clearChipTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: '#EB466D',
  },
  clearChipTxtDisabled: {
    color: '#ADB5BD',
  },

  /* Status indicator */
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#787A7D',
  },

  /* Preview */
  previewCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.success,
    backgroundColor: '#F0FDF9',
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    margin: 12,
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  previewBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  retakeBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retakeTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default SignaturePad;
