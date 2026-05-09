import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { Typography } from '../common';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { AppearancePreference } from '../../store/themePreferencesStore';
import { UI_CONFIG } from '../../constants/config';

const OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const AppearanceSettingsSection: React.FC = () => {
  const { colors, appearance, setAppearance } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Typography variant="h4" style={styles.sectionTitle}>
        Appearance
      </Typography>
      <Typography variant="caption" style={styles.helper}>
        Choose a theme for menus, lists, and forms. System follows your device settings.
      </Typography>
      <View style={styles.segmentRow}>
        {OPTIONS.map((opt) => {
          const selected = appearance === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setAppearance(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Theme ${opt.label}`}
            >
              <Typography
                variant="body"
                style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}
              >
                {opt.label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    section: {
      marginBottom: UI_CONFIG.spacing.lg,
    },
    sectionTitle: {
      marginBottom: UI_CONFIG.spacing.xs,
      color: colors.text,
    },
    helper: {
      marginBottom: UI_CONFIG.spacing.md,
      color: colors.textSecondary,
    },
    segmentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: UI_CONFIG.spacing.sm,
    },
    segment: {
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingVertical: UI_CONFIG.spacing.sm,
      borderRadius: UI_CONFIG.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    segmentSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceLight,
    },
    segmentLabel: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
    segmentLabelSelected: {
      color: colors.accent,
    },
  });
}

export default AppearanceSettingsSection;
