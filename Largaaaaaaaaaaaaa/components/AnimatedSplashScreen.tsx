import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const bgOpacity = useSharedValue(1);
  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Logo fades in
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, { duration: 600 });

    // Floating animation (up and down) - repeating
    floatY.value = withTiming(20, {
      duration: 2000,
    });

    // Glow pulse animation - repeating
    glowOpacity.value = withTiming(0.8, {
      duration: 1200,
    });

    // After 2.5 seconds, fade out
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
      bgOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
    }, 2500);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: floatY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      {/* Glow effect background */}
      <Animated.View style={[styles.glowRing, glowStyle]} />
      
      {/* Logo with float animation */}
      <Animated.Image
        source={require('../assets/images/icon.png')}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2EBD85',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    zIndex: 1,
  },
});