import { Dimensions, StyleSheet } from 'react-native';
import { AppPalette } from '../../theme/palettes';
import { UserRole } from '../../types';

export const ROLE_LOGIN_COPY: Record<
  Extract<UserRole, 'admin' | 'driver'>,
  { title: string; subtitle: string; button: string }
> = {
  admin: {
    title: 'Admin Sign In',
    subtitle: 'Manage platform operations',
    button: 'Sign in to admin account',
  },
  driver: {
    title: 'Driver Sign In',
    subtitle: 'Accept jobs and deliver water tankers',
    button: 'Sign in to driver account',
  },
};

export function generateGridWatermarkPositions(
  count: number,
  minSpacing = 72
): Array<{ top: number; left: number }> {
  const { width, height } = Dimensions.get('window');
  const cols = Math.max(3, Math.floor(width / minSpacing));
  const positions: Array<{ top: number; left: number }> = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      left: col * minSpacing + 16,
      top: row * minSpacing + (height * 0.08) + ((i % 2) * 12),
    });
  }

  return positions;
}

export function createAuthFormCardStyles(colors: AppPalette) {
  return StyleSheet.create({
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    backText: {
      marginLeft: 2,
      color: colors.accent,
      fontWeight: '600',
    },
    screenTitle: {
      fontSize: 28,
      fontFamily: 'PlayfairDisplay-Regular',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    screenSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 22,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      color: colors.textLight,
      fontSize: 16,
      fontWeight: '700',
    },
    watermarkContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.06,
      zIndex: 0,
      pointerEvents: 'none',
    },
  });
}
