// Guideline Component - walks the user into the correct role-specific app entry point.
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

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
    title: 'No More Long Waitings',
    description: 'Book your ride instantly and get picked up within minutes. No more waiting in long queues at bus stops.',
    icon: 'location-outline',
    gradient: ['#3B82F6', '#1E40AF'],
  },
  {
    id: 2,
    title: 'Effortless & Reliable Journey Tracking',
    description: 'Track your journey in real-time with live GPS updates and accurate arrival estimates every step of the way.',
    icon: 'map-outline',
    gradient: ['#10B981', '#10B981'],
  },
  {
    id: 3,
    title: 'Real Time Notifications',
    description: 'Receive instant notifications about your booking status, driver location, and important updates.',
    icon: 'notifications-outline',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
];

interface GuidelineProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function Guideline({ onComplete, onSkip }: GuidelineProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const { session, status } = useAppSession();
  const defaultPath = status === 'signedIn' && session
    ? getDefaultAppPath(session.role)
    : '/login';

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else if (onComplete) {
      onComplete();
    } else {
      router.replace(defaultPath);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      router.replace(defaultPath);
    }
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={slide.gradient[0]} />

      <LinearGradient
        colors={slide.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerSection}
      >
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButtonTop}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <View style={styles.centerFlex}>
          <View style={styles.iconContainer}>
            <Ionicons name={slide.icon as any} size={110} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentSection}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>

        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index === currentSlide ? slide.gradient[0] : '#E5E7EB',
                  width: index === currentSlide ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

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
  skipButtonTop: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
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
  buttonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skipButtonBottom: {
    flex: 0.25,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
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
