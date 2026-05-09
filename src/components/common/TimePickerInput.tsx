import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../constants/config';
import Typography from './Typography';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface TimePickerInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | undefined;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

const parseTimeString = (value: string): Date | null => {
  const match = value.match(TIME_PATTERN);
  if (!match) return null;

  const hours = parseInt(match[1] ?? '', 10);
  const minutes = parseInt(match[2] ?? '', 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
};

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const TimePickerInput: React.FC<TimePickerInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = 'HH:MM',
  error,
  containerStyle,
  disabled = false,
}) => {
  const { colors, resolvedScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pickerThemeVariant = resolvedScheme === 'dark' ? 'dark' : 'light';

  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  useEffect(() => {
    const parsed = parseTimeString(value);
    if (parsed) {
      setSelectedTime(parsed);
    }
  }, [value]);

  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && time) {
      setSelectedTime(time);
      onChangeText(formatTime(time));
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography variant="body" style={styles.label}>{label}</Typography>}

      <TouchableOpacity
        style={[styles.inputContainer, error && styles.inputError, disabled && styles.disabledInput]}
        onPress={() => {
          if (!disabled) {
            setShowPicker(true);
          }
        }}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Typography
          variant="body"
          style={value ? styles.valueText : styles.placeholderText}
        >
          {value || placeholder}
        </Typography>
        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {error && <Typography variant="caption" style={styles.errorText}>{error}</Typography>}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          themeVariant={pickerThemeVariant}
          is24Hour
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Typography variant="body" style={styles.modalActionText}>Done</Typography>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                themeVariant={pickerThemeVariant}
                is24Hour
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: UI_CONFIG.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: colors.surface,
      borderRadius: UI_CONFIG.borderRadius.lg,
      padding: UI_CONFIG.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputError: {
      borderColor: colors.error,
    },
    disabledInput: {
      opacity: 0.6,
    },
    valueText: {
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    placeholderText: {
      color: colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    errorText: {
      color: colors.error,
      fontSize: UI_CONFIG.fontSize.sm,
      marginTop: 4,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 20,
    },
    modalHeader: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    modalActionText: {
      fontWeight: '600',
      color: colors.accent,
    },
  });
}

export default TimePickerInput;
