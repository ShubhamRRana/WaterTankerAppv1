import React, { memo, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Typography from './Typography';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

function variantTextStyles(variant: 'primary' | 'secondary' | 'outline') {
  if (variant === 'primary') return 'primaryText' as const;
  if (variant === 'secondary') return 'secondaryText' as const;
  return 'outlineText' as const;
}

function sizeTextStyles(size: 'small' | 'medium' | 'large') {
  return `${size}Text` as 'smallText' | 'mediumText' | 'largeText';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const buttonStyle = useMemo(
    () => [
      styles.button,
      styles[variant],
      styles[size],
      disabled && styles.disabled,
      style,
    ],
    [styles, variant, size, disabled, style]
  );

  const textStyle = useMemo(() => {
    const vtKey = variantTextStyles(variant);
    const szKey = sizeTextStyles(size);
    return [
      styles.text,
      styles[vtKey],
      styles[szKey],
      disabled && styles.disabledText,
    ];
  }, [styles, variant, size, disabled]);

  const indicatorColor =
    variant === 'primary'
      ? colors.onAccent
      : variant === 'secondary'
        ? colors.onSecondary
        : colors.accent;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <Typography variant="body" style={textStyle}>
          {title}
        </Typography>
      )}
    </TouchableOpacity>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    button: {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accent,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 6,
        height: 6,
      },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 6,
    },
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
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
    disabled: {
      backgroundColor: colors.disabled,
      borderColor: colors.disabled,
      shadowOpacity: 0.3,
    },
    text: {
      fontWeight: '600',
      fontSize: 18,
    },
    primaryText: {
      color: colors.onAccent,
    },
    secondaryText: {
      color: colors.onSecondary,
    },
    outlineText: {
      color: colors.accent,
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
      color: colors.textSecondary,
    },
  });
}

export default memo(Button);
