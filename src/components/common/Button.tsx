import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    isPressed && styles.buttonPressed,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'secondary' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.primary}
          size="small"
        />
      ) : (
        <Typography variant="body" style={textStyle}>{title}</Typography>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_CONFIG.colors.primary,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  // Variants
  primary: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  secondary: {
    backgroundColor: UI_CONFIG.colors.secondary,
    borderColor: UI_CONFIG.colors.secondary,
  },
  outline: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  // Sizes
  small: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  medium: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  large: {
    paddingHorizontal: 27,
    paddingVertical: 11,
  },
  // States
  disabled: {
    backgroundColor: UI_CONFIG.colors.disabled,
    borderColor: UI_CONFIG.colors.disabled,
    shadowOpacity: 0.3,
  },
  buttonPressed: {
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  // Text styles
  text: {
    fontWeight: '600',
    fontSize: 18,
  },
  primaryText: {
    color: UI_CONFIG.colors.textLight,
  },
  secondaryText: {
    color: UI_CONFIG.colors.textLight,
  },
  outlineText: {
    color: UI_CONFIG.colors.primary,
  },
  smallText: {
    fontSize: 18,
  },
  mediumText: {
    fontSize: 18,
  },
  largeText: {
    fontSize: 18,
  },
  disabledText: {
    color: UI_CONFIG.colors.textSecondary,
  },
});

export default Button;
