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

export interface MonthYearStepperRowProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (monthIndex: number) => void;
  onYearChange: (year: number) => void;
  availableYears?: number[];
}

const MonthYearStepperRow: React.FC<MonthYearStepperRowProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  availableYears: availableYearsProp,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const availableYears = availableYearsProp ?? getDefaultYears();

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      onYearChange(selectedYear - 1);
      onMonthChange(11);
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      onYearChange(selectedYear + 1);
      onMonthChange(0);
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthStepper}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={goToPreviousMonth}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Typography variant="body" style={styles.monthLabel} numberOfLines={1}>
          {`${MONTH_LABELS[selectedMonth]} ${selectedYear}`}
        </Typography>

        <TouchableOpacity
          style={styles.stepButton}
          onPress={goToNextMonth}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.yearDropdownButton}
        onPress={() => setYearDropdownOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Select year"
      >
        <Typography variant="body" style={styles.yearDropdownText} numberOfLines={1}>
          {selectedYear}
        </Typography>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={yearDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYearDropdownOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setYearDropdownOpen(false)}
        >
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
                      setYearDropdownOpen(false);
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
      alignItems: 'center',
      gap: 10,
      marginBottom: UI_CONFIG.spacing.sm,
    },
    monthStepper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepButton: {
      padding: 6,
    },
    monthLabel: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontWeight: '600',
    },
    yearDropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 88,
    },
    yearDropdownText: {
      marginRight: 8,
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

export default MonthYearStepperRow;
