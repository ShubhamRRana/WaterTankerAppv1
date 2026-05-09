import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: 'small' | 'medium' | 'large';
}

type PaddingKey = 'smallPadding' | 'mediumPadding' | 'largePadding';

function paddingKeyFor(padding: 'small' | 'medium' | 'large'): PaddingKey {
  if (padding === 'small') return 'smallPadding';
  if (padding === 'large') return 'largePadding';
  return 'mediumPadding';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'medium',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const padKey = paddingKeyFor(padding);

  const cardStyle = [
    styles.card,
    styles[padKey],
    onPress && styles.pressable,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: UI_CONFIG.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    pressable: {},
    smallPadding: {
      padding: UI_CONFIG.spacing.sm,
    },
    mediumPadding: {
      padding: UI_CONFIG.spacing.md,
    },
    largePadding: {
      padding: UI_CONFIG.spacing.lg,
    },
  });
}

export default Card;
