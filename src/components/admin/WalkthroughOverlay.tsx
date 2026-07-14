import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  AccessibilityInfo,
  TouchableOpacity,
} from 'react-native';
import Typography from '../common/Typography';
import Button from '../common/Button';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { UI_CONFIG } from '../../constants/config';

export type Rect = { x: number; y: number; width: number; height: number };

export type WalkthroughOverlayProps = {
  mode: 'welcome' | 'spotlight' | 'saving' | 'saveError';
  title: string;
  body: string;
  stepIndex: number;
  stepCount: number;
  highlight: Rect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onRetrySave: () => void;
  canGoBack: boolean;
  isLast: boolean;
};

const RING_PADDING = 4;
const FILL_DURATION = 260;
const SLIDE_DURATION = 320;

function DimLayer({ highlight, colors }: { highlight: Rect | null; colors: AppPalette }) {
  const dim = { backgroundColor: colors.overlayDark };
  if (!highlight) return <View style={[StyleSheet.absoluteFillObject, dim]} />;

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const top = Math.max(0, highlight.y - RING_PADDING);
  const bottom = Math.max(0, screenH - (highlight.y + highlight.height + RING_PADDING));
  const left = Math.max(0, highlight.x - RING_PADDING);
  const right = Math.max(0, screenW - (highlight.x + highlight.width + RING_PADDING));
  const ringStyle = {
    width: highlight.width + RING_PADDING * 2,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 8,
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[dim, { height: top, width: '100%' }]} />
      <View style={{ flexDirection: 'row', height: highlight.height + RING_PADDING * 2 }}>
        <View style={[dim, { width: left }]} />
        <View style={ringStyle} />
        <View style={[dim, { width: right, flex: 1 }]} />
      </View>
      <View style={[dim, { height: bottom, width: '100%', flex: 1 }]} />
    </View>
  );
}

const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  mode,
  title,
  body,
  stepIndex,
  stepCount,
  highlight,
  onNext,
  onBack,
  onSkip,
  onFinish,
  onRetrySave,
  canGoBack,
  isLast,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reduceMotionRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const isBusy = mode === 'saving';
  const progress = stepCount > 0 ? (stepIndex + 1) / stepCount : 0;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    const duration = reduceMotionRef.current ? 0 : SLIDE_DURATION;
    Animated.timing(slideAnim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    const duration = reduceMotionRef.current ? 0 : FILL_DURATION;
    Animated.timing(fillAnim, {
      toValue: progress,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth],
    extrapolate: 'clamp',
  });

  const handleNext = () => !isBusy && (isLast ? onFinish() : onNext());
  const handleBack = () => !isBusy && onBack();
  const handleSkip = () => !isBusy && onSkip();

  return (
    <Modal
      visible
      transparent
      animationType="none"
      accessibilityViewIsModal
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View style={styles.root}>
        <DimLayer highlight={mode === 'spotlight' ? highlight : null} colors={colors} />

        <Animated.View style={[styles.ticket, { transform: [{ translateY }] }]}>
          <View style={styles.accentStrip} />
          <View style={styles.ticketBody}>
            <Typography variant="caption" style={styles.progressLabel} accessibilityLiveRegion="polite">
              {`Step ${stepIndex + 1} of ${stepCount}`}
            </Typography>
            <View style={styles.progressTrack} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
              <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
            </View>

            <Typography variant="h2" style={styles.title} accessibilityRole="header">
              {title}
            </Typography>
            <Typography variant="body" style={styles.body}>
              {body}
            </Typography>
            {mode === 'saveError' && (
              <Typography variant="caption" style={styles.errorText}>
                Couldn&apos;t save progress
              </Typography>
            )}

            <View style={styles.ctaRow}>
              <TouchableOpacity
                onPress={handleSkip}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Skip tour"
                style={styles.textButton}
              >
                <Typography variant="body" style={[styles.textButtonLabel, isBusy && styles.disabledLabel]}>
                  Skip tour
                </Typography>
              </TouchableOpacity>

              <View style={styles.ctaRight}>
                {canGoBack && (
                  <TouchableOpacity
                    onPress={handleBack}
                    disabled={isBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={styles.textButton}
                  >
                    <Typography variant="body" style={[styles.textButtonLabel, isBusy && styles.disabledLabel]}>
                      Back
                    </Typography>
                  </TouchableOpacity>
                )}
                {mode === 'saveError' ? (
                  <Button title="Retry" onPress={onRetrySave} size="small" />
                ) : (
                  <Button title={isLast ? 'Finish' : 'Next'} onPress={handleNext} disabled={isBusy} size="small" />
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    ticket: {
      backgroundColor: colors.surface,
      borderRadius: UI_CONFIG.borderRadius.xl,
      marginHorizontal: UI_CONFIG.spacing.md,
      marginBottom: UI_CONFIG.spacing.lg,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    accentStrip: {
      height: 3,
      backgroundColor: colors.accent,
    },
    ticketBody: {
      padding: UI_CONFIG.spacing.lg,
    },
    progressLabel: {
      color: colors.textSecondary,
      marginBottom: UI_CONFIG.spacing.xs,
    },
    progressTrack: {
      height: 4,
      borderRadius: UI_CONFIG.borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      overflow: 'hidden',
      marginBottom: UI_CONFIG.spacing.md,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: UI_CONFIG.borderRadius.sm,
    },
    title: {
      fontFamily: 'PlayfairDisplay-Regular',
      color: colors.text,
      marginBottom: UI_CONFIG.spacing.xs,
    },
    body: {
      color: colors.textSecondary,
      marginBottom: UI_CONFIG.spacing.md,
    },
    errorText: {
      color: colors.error,
      fontWeight: '600',
      marginBottom: UI_CONFIG.spacing.md,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ctaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_CONFIG.spacing.md,
    },
    textButton: {
      paddingVertical: UI_CONFIG.spacing.sm,
      paddingHorizontal: UI_CONFIG.spacing.xs,
    },
    textButtonLabel: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    disabledLabel: {
      color: colors.disabled,
    },
  });
}

export default WalkthroughOverlay;
