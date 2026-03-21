/**
 * Custom Driver Marker — Animated car icon with heading rotation
 */
import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {Marker} from 'react-native-maps';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';

const DriverMarker = ({position}) => {
  const coord = useMemo(
    () => ({
      latitude: position.latitude,
      longitude: position.longitude,
    }),
    [position.latitude, position.longitude],
  );

  // Rotate based on heading (0 = north)
  const rotation = position.heading || 0;

  return (
    <Marker
      coordinate={coord}
      anchor={{x: 0.5, y: 0.5}}
      flat
      tracksViewChanges={false}
      rotation={rotation}>
      <View style={$.wrap}>
        <View style={$.pulse} />
        <View style={$.dot}>
          <Icon name="navigation-variant" size={16} color={colors.white} />
        </View>
      </View>
    </Marker>
  );
};

const $ = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(36, 64, 102, 0.12)',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default React.memo(DriverMarker);
