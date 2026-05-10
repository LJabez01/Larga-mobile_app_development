import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#10B981';
const SECONDARY = '#059669';
const BG_LIGHT = '#F0FDF4';

interface Slide {
  id: number;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
}

const slides: Slide[] = [
  {
    id: 1,
    title: 'Real-Time Vehicle Tracking',
    description: 'See exactly where your jeepney or bus is located with live GPS updates. Know when it arrives, every second.',
    icon: 'location-outline',
    gradient: ['#3B82F6', '#1E40AF'],
  },
  {
    id: 2,
    title: 'Smart Route Navigation',
    description: 'Browse active routes and track vehicles moving through Santa Maria in real-time. Stay connected to your journey.',
    icon: 'map-outline',
    gradient: ['#10B981', '#10B981'],
  },
  {
    id: 3,
    title: 'Instant Notifications',
    description: 'Get notified about vehicle locations, driver status, and route updates instantly. Never miss a moment.',
    icon: 'notifications-outline',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
];

interface GuidelineProps {
  onComplete?: () => void;
}

export default function Guideline({ onComplete }: GuidelineProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const descriptionOpacity = useRef(new Animated.Value(0)).current;
  const descriptionTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Reset animations
    titleOpacity.setValue(0);
    titleTranslate.setValue(20);
    descriptionOpacity.setValue(0);
    descriptionTranslate.setValue(20);

    // Trigger animations sequentially
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(descriptionOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(descriptionTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [currentSlide]);



  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      if (onComplete) {
        onComplete();
      } else {
        router.push('/driver' as any);
      }
    }
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={slide.gradient[0]} />

      {/* Gradient Banner Section - Top 50% */}
      <LinearGradient
        colors={slide.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerSection}
      >
        <View style={styles.centerFlex}>
          <View style={styles.iconContainer}>
            <Ionicons name={slide.icon as any} size={110} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* White Content Section - Bottom 50% */}
      <View style={styles.contentSection}>
        {/* Text Content */}
        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslate }],
              },
            ]}
          >
            {slide.title}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.description,
              {
                opacity: descriptionOpacity,
                transform: [{ translateY: descriptionTranslate }],
              },
            ]}
          >
            {slide.description}
          </Animated.Text>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index === currentSlide ? slide.gradient[0] : '#E5E7EB',
                  width: index === currentSlide ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Bottom Button Section */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.nextButton, { backgroundColor: slide.gradient[0] }]}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.nextButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 8,
  },

  bannerSection: {
    height: '50%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  centerFlex: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 36,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },


  nextButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextButtonIcon: {
    marginLeft: 4,
  },
});
