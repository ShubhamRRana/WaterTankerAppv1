import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDefaultYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
}

export interface MonthYearFilterRowProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (monthIndex: number) => void;
  onYearChange: (year: number) => void;
  availableYears?: number[];
}

type OpenDropdown = 'month' | 'year' | null;

const MonthYearFilterRow: React.FC<MonthYearFilterRowProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  availableYears: availableYearsProp,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  const availableYears = availableYearsProp ?? getDefaultYears();

  const closeDropdown = () => setOpenDropdown(null);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setOpenDropdown('month')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Select month"
      >
        <Typography variant="body" style={styles.dropdownButtonText} numberOfLines={1}>
          {MONTH_LABELS[selectedMonth]}
        </Typography>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setOpenDropdown('year')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Select year"
      >
        <Typography variant="body" style={styles.dropdownButtonText} numberOfLines={1}>
          {selectedYear}
        </Typography>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={openDropdown === 'month'}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={closeDropdown}>
          <View style={styles.dropdownContent}>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {MONTH_LABELS.map((month, index) => {
                const active = selectedMonth === index;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                    onPress={() => {
                      onMonthChange(index);
                      closeDropdown();
                    }}
                    activeOpacity={0.7}
                    accessibilityState={{ selected: active }}
                  >
                    <Typography
                      variant="body"
                      style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}
                    >
                      {month}
                    </Typography>
                    {active ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={openDropdown === 'year'}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={closeDropdown}>
          <View style={styles.dropdownContent}>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {availableYears.map((year) => {
                const active = selectedYear === year;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                    onPress={() => {
                      onYearChange(year);
                      closeDropdown();
                    }}
                    activeOpacity={0.7}
                    accessibilityState={{ selected: active }}
                  >
                    <Typography
                      variant="body"
                      style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}
                    >
                      {year}
                    </Typography>
                    {active ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: UI_CONFIG.spacing.lg,
      paddingVertical: UI_CONFIG.spacing.sm,
    },
    dropdownButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownButtonText: {
      flex: 1,
      marginRight: 10,
      color: colors.text,
      fontWeight: '600',
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    dropdownContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 8,
      width: '100%',
      maxWidth: 420,
      maxHeight: 420,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    dropdownScroll: {
      width: '100%',
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    dropdownOptionActive: {
      backgroundColor: colors.background,
    },
    dropdownOptionText: {
      flex: 1,
      color: colors.text,
    },
    dropdownOptionTextActive: {
      fontWeight: '600',
      color: colors.accent,
    },
  });
}

export default MonthYearFilterRow;
