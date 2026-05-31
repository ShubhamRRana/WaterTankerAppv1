import React, { useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
} from 'react-native';
import Card from '../common/Card';
import { Typography, Button } from '../common';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface FormState {
  businessName: string;
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  businessName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface EditProfileFormProps {
  formData: FormState;
  formErrors: FormErrors;
  isSaving: boolean;
  isDirty: boolean;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  formData,
  formErrors,
  isSaving,
  isDirty,
  onFieldChange,
  onSave,
  onCancel,
}) => {
  const businessNameInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getCharacterCount = (text: string, maxLength: number) => {
    return `${text.length}/${maxLength}`;
  };

  const getCharacterCountColor = (text: string, maxLength: number) => {
    const percentage = (text.length / maxLength) * 100;
    if (percentage >= 90) return colors.error;
    if (percentage >= 75) return colors.warning;
    return colors.textSecondary;
  };

  return (
    <Card style={styles.editCard}>
      <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
      
      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Business Name</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.businessName, 100) }
            ]}
          >
            {getCharacterCount(formData.businessName, 100)}
          </Typography>
        </View>
        <TextInput
          ref={businessNameInputRef}
          style={[styles.textInput, formErrors.businessName && styles.textInputError]}
          value={formData.businessName}
          onChangeText={(t) => onFieldChange('businessName', t)}
          placeholder="Enter business name"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Business name input"
          maxLength={100}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => nameInputRef.current?.focus()}
        />
        {formErrors.businessName && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.businessName}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Full Name</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.name, 50) }
            ]}
          >
            {getCharacterCount(formData.name, 50)}
          </Typography>
        </View>
        <TextInput
          ref={nameInputRef}
          style={[styles.textInput, formErrors.name && styles.textInputError]}
          value={formData.name}
          onChangeText={(t) => onFieldChange('name', t)}
          placeholder="Enter full name"
          placeholderTextColor={colors.textSecondary}
          maxLength={50}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailInputRef.current?.focus()}
        />
        {formErrors.name && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.name}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Email Address</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.email, 100) }
            ]}
          >
            {getCharacterCount(formData.email, 100)}
          </Typography>
        </View>
        <TextInput
          ref={emailInputRef}
          style={[styles.textInput, formErrors.email && styles.textInputError]}
          value={formData.email}
          onChangeText={(t) => onFieldChange('email', t)}
          placeholder="Enter email address"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => phoneInputRef.current?.focus()}
        />
        {formErrors.email && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.email}
          </Typography>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Typography variant="body" style={styles.inputLabel}>Phone Number</Typography>
          <Typography 
            variant="caption" 
            style={[
              styles.characterCount, 
              { color: getCharacterCountColor(formData.phone, 10) }
            ]}
          >
            {getCharacterCount(formData.phone, 10)}
          </Typography>
        </View>
        <TextInput
          ref={phoneInputRef}
          style={[styles.textInput, formErrors.phone && styles.textInputError]}
          value={formData.phone}
          onChangeText={(t) => onFieldChange('phone', t)}
          placeholder="Enter phone number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
        {formErrors.phone && (
          <Typography variant="caption" style={styles.errorText}>
            {formErrors.phone}
          </Typography>
        )}
      </View>

      <View style={styles.row}>
        <Button 
          title="Cancel" 
          onPress={onCancel}
          variant="outline" 
          style={styles.rowButton}
          disabled={isSaving}
        />
        <Button 
          title={isSaving ? "Saving..." : "Save"} 
          onPress={onSave} 
          variant="primary" 
          style={styles.rowButton}
          disabled={isSaving || !isDirty}
          loading={isSaving}
        />
      </View>
    </Card>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  editCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textInputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
}

export default EditProfileForm;
