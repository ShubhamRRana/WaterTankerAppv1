import React, { useEffect, useState } from 'react';
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

interface DatePickerInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | undefined;
  containerStyle?: StyleProp<ViewStyle>;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

const DATE_PATTERN = /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/;

const parseDateString = (value: string): Date | null => {
  const match = value.match(DATE_PATTERN);
  if (!match) return null;

  const day = parseInt(match[1] ?? '', 10);
  const month = parseInt(match[2] ?? '', 10) - 1;
  const year = parseInt(match[3] ?? '', 10);
  const parsed = new Date(year, month, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getDate() !== day ||
    parsed.getMonth() !== month ||
    parsed.getFullYear() !== year
  ) {
    return null;
  }

  return parsed;
};

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = 'DD/MM/YYYY',
  error,
  containerStyle,
  minimumDate,
  maximumDate,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const parsed = parseDateString(value);
    if (parsed) {
      setSelectedDate(parsed);
    }
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      onChangeText(formatDate(date));
    }
  };

  const pickerDateProps = {
    ...(minimumDate ? { minimumDate } : {}),
    ...(maximumDate ? { maximumDate } : {}),
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
        <Ionicons name="calendar-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
      </TouchableOpacity>

      {error && <Typography variant="caption" style={styles.errorText}>{error}</Typography>}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          {...pickerDateProps}
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
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                {...pickerDateProps}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: UI_CONFIG.fontSize.md,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: UI_CONFIG.borderRadius.lg,
    padding: UI_CONFIG.spacing.md,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: UI_CONFIG.colors.error,
  },
  disabledInput: {
    opacity: 0.6,
  },
  valueText: {
    color: UI_CONFIG.colors.text,
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: UI_CONFIG.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    fontSize: UI_CONFIG.fontSize.sm,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalContent: {
    backgroundColor: UI_CONFIG.colors.surface,
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
    color: UI_CONFIG.colors.accent,
  },
});

export default DatePickerInput;
