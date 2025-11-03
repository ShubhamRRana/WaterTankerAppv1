import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  padding?: 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'medium',
}) => {
  const cardStyle = [
    styles.card,
    styles[`${padding}Padding`],
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: UI_CONFIG.borderRadius.lg,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pressable: {
    // Additional styles for pressable cards if needed
  },
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

export default Card;
