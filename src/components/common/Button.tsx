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
          color={variant === 'primary' || variant === 'secondary' ? '#090909' : '#007AFF'}
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
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#000000',
    // Neumorphic shadow effect - approximating dual shadows
    shadowColor: '#c5c5c5',
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  // Variants - keeping variant support but with neumorphic base
  primary: {
    backgroundColor: '#e8e8e8',
    borderColor: '#000000',
  },
  secondary: {
    backgroundColor: '#e8e8e8',
    borderColor: '#000000',
  },
  outline: {
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#000000',
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
    backgroundColor: '#c5c5c5',
    borderColor: '#000000',
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
    color: '#090909',
  },
  secondaryText: {
    color: '#090909',
  },
  outlineText: {
    color: '#090909',
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
    color: '#666666',
  },
});

export default Button;
