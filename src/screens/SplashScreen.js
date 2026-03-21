/**
 * Splash Screen — Shown while checking auth session
 * Uses the branded splash image as a full-screen background
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import {colors} from '../theme/colors';
import images from '../theme/assets';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.imageWrap}>
        <Image
          source={images.splash}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  splashImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default SplashScreen;
