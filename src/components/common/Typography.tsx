import React, { useMemo } from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  children,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Text style={[styles[variant], style]} {...props}>
      {children}
    </Text>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    h1: {
      fontSize: UI_CONFIG.fontSize.xxl,
      fontWeight: '700',
      lineHeight: UI_CONFIG.fontSize.xxl * 1.2,
      color: colors.text,
    },
    h2: {
      fontSize: UI_CONFIG.fontSize.xl,
      fontWeight: '600',
      lineHeight: UI_CONFIG.fontSize.xl * 1.2,
      color: colors.text,
    },
    h3: {
      fontSize: UI_CONFIG.fontSize.lg,
      fontWeight: '600',
      lineHeight: UI_CONFIG.fontSize.lg * 1.2,
      color: colors.text,
    },
    h4: {
      fontSize: UI_CONFIG.fontSize.md,
      fontWeight: '600',
      lineHeight: UI_CONFIG.fontSize.md * 1.2,
      color: colors.text,
    },
    body: {
      fontSize: UI_CONFIG.fontSize.md,
      lineHeight: UI_CONFIG.fontSize.md * 1.4,
      color: colors.text,
    },
    caption: {
      fontSize: UI_CONFIG.fontSize.sm,
      lineHeight: UI_CONFIG.fontSize.sm * 1.4,
      color: colors.textSecondary,
    },
  });
}

export default Typography;
