import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * Branded splash overlay shown on top of the app. It mirrors the native splash
 * (same teal background + icon) so the hand-off is seamless: the native splash
 * hides once the session check finishes, this fades/scales in, then fades out
 * via `onFinish` when `visible` becomes false.
 */
export default function AnimatedSplash({ visible, onFinish }) {
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const titleFade = useRef(new Animated.Value(0)).current;

  // Intro animation: pop the logo and reveal the wordmark.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, titleFade]);

  // Outro: once bootstrapping is done, fade the whole overlay away.
  useEffect(() => {
    if (!visible) {
      Animated.timing(fade, {
        toValue: 0,
        duration: 450,
        delay: 250,
        useNativeDriver: true,
      }).start(() => onFinish && onFinish());
    }
  }, [visible, fade, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: titleFade, alignItems: 'center' }}>
        <Text style={styles.title}>Money Tracker</Text>
        <Text style={styles.tagline}>Know where your money goes</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 140, height: 140, marginBottom: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: colors.primaryLight, fontSize: 14, marginTop: 6 },
});
