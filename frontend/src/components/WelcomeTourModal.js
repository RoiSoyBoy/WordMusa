import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🎵',
    title: 'שמע שיר, ראה מילים',
    body: 'פתח את Spotify ו-PsychoLyrics יציג את מילות השיר בזמן אמת עם תרגום לעברית — אוטומטית.',
    accentColor: theme.colors.accent,
    bgColor: 'rgba(124,106,247,0.12)',
  },
  {
    emoji: '🟢',
    title: 'מילות פסיכומטרי',
    body: 'מילים שכדאי לדעת לפסיכומטרי יסומנו בירוק. לחץ על כל מילה לכרטיס הסבר מלא עם הגדרה, דוגמאות ומילים נרדפות.',
    accentColor: theme.colors.accentGreen,
    bgColor: 'rgba(106,247,200,0.12)',
  },
  {
    emoji: '⭐',
    title: 'לומדים בקלות',
    body: 'הוסף מילים לרשימת הפוקוס שלך וחזור עליהן בקלפי חזרה — ככה בונים אוצר מילים בלי מאמץ.',
    accentColor: '#FFC832',
    bgColor: 'rgba(255,200,50,0.12)',
  },
];

export default function WelcomeTourModal({ visible, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  // Animate sheet in on mount
  useEffect(() => {
    if (visible) {
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      animateIconIn();
    }
  }, [visible]);

  const animateIconIn = () => {
    iconScale.setValue(0.6);
    iconOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goToSlide = (next) => {
    const direction = next > slideIndex ? -1 : 1;
    Animated.timing(slideAnim, {
      toValue: direction * SCREEN_WIDTH,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSlideIndex(next);
      slideAnim.setValue(-direction * SCREEN_WIDTH * 0.3);
      animateIconIn();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (slideIndex < SLIDES.length - 1) {
      goToSlide(slideIndex + 1);
    } else {
      handleClose(false);
    }
  };

  const handleClose = async (persist) => {
    if (persist) {
      try { await AsyncStorage.setItem('hasSeenTour', 'true'); } catch (_) {}
    }
    onClose();
  };

  const slide = SLIDES[slideIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => handleClose(false)}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { opacity: sheetOpacity }]}>

          {/* Drag handle */}
          <View style={styles.dragArea}>
            <View style={styles.handle} />
          </View>

          {/* Slide content */}
          <Animated.View style={[styles.slideWrap, { transform: [{ translateX: slideAnim }] }]}>

            {/* Icon bubble */}
            <Animated.View
              style={[
                styles.iconBubble,
                { backgroundColor: slide.bgColor },
                { transform: [{ scale: iconScale }], opacity: iconOpacity },
              ]}
            >
              <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            </Animated.View>

            <Text style={[styles.slideTitle, { color: slide.accentColor }]}>{slide.title}</Text>
            <Text style={styles.slideBody}>{slide.body}</Text>
          </Animated.View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === slideIndex
                    ? { backgroundColor: slide.accentColor, width: 20 }
                    : { backgroundColor: 'rgba(255,255,255,0.25)', width: 8 },
                ]}
              />
            ))}
          </View>

          {/* Next / Start button */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: slide.accentColor }]}
            activeOpacity={0.8}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {slideIndex < SLIDES.length - 1 ? 'הבא ←' : 'בוא נתחיל !'}
            </Text>
          </TouchableOpacity>

          {/* Don't show again */}
          <TouchableOpacity
            onPress={() => handleClose(true)}
            activeOpacity={0.6}
            style={styles.dismissBtn}
          >
            <Text style={styles.dismissText}>אל תציג שוב</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  slideWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 20,
  },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  slideEmoji: {
    fontSize: 42,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  slideBody: {
    color: 'rgba(240,238,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    marginHorizontal: 24,
    borderRadius: 500,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  nextBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dismissText: {
    color: theme.colors.muted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
