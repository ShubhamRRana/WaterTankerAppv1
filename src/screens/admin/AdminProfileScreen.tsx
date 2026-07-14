import React, { useEffect, useState, useReducer, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  AccessibilityInfo,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Card, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import ProfileHeader from '../../components/admin/ProfileHeader';
import AdminSubscriptionCard from '../../components/admin/AdminSubscriptionCard';
import EditProfileForm from '../../components/admin/EditProfileForm';
import AppearanceSettingsSection from '../../components/settings/AppearanceSettingsSection';
import { useAuthStore } from '../../store/authStore';
import { User, isAdminUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { getErrorMessage } from '../../utils/errors';
import { AuthService } from '../../services/auth.service';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { useOptionalAdminWalkthrough } from '../../context/AdminWalkthroughContext';
import { WalkthroughTarget } from '../../walkthrough/WalkthroughTarget';

type AdminProfileScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Profile'>;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateSectionLayout(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  colors: AppPalette;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, onPress, disabled, colors }) => {
  const styles = useMemo(() => createSettingsRowStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Typography variant="body" style={styles.label}>{label}</Typography>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

function createSettingsRowStyles(colors: AppPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      color: colors.text,
    },
  });
}

interface SectionEyebrowProps {
  title: string;
  colors: AppPalette;
}

const SectionEyebrow: React.FC<SectionEyebrowProps> = ({ title, colors }) => (
  <Typography
    variant="caption"
    style={{
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    }}
  >
    {title}
  </Typography>
);

// Form state interface
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

interface AppState {
  isEditing: boolean;
  editForm: FormState;
  formErrors: FormErrors;
  isSaving: boolean;
  isDirty: boolean;
  menuVisible: boolean;
  networkError: string | null;
  initialForm: FormState | null;
}

type AppAction =
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string }
  | { type: 'SET_ERRORS'; payload: FormErrors }
  | { type: 'CLEAR_ERROR'; field: keyof FormErrors }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_MENU_VISIBLE'; payload: boolean }
  | { type: 'SET_NETWORK_ERROR'; payload: string | null }
  | { type: 'RESET_FORM'; payload: FormState }
  | { type: 'INITIALIZE_FORM'; payload: FormState };

const initialState: AppState = {
  isEditing: false,
  editForm: {
    businessName: '',
    name: '',
    email: '',
    phone: '',
  },
  formErrors: {},
  isSaving: false,
  isDirty: false,
  menuVisible: false,
  networkError: null,
  initialForm: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    case 'UPDATE_FIELD':
      return {
        ...state,
        editForm: { ...state.editForm, [action.field]: action.value },
      };
    case 'SET_ERRORS':
      return { ...state, formErrors: action.payload };
    case 'CLEAR_ERROR':
      const newErrors = { ...state.formErrors };
      delete newErrors[action.field];
      return { ...state, formErrors: newErrors };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SET_MENU_VISIBLE':
      return { ...state, menuVisible: action.payload };
    case 'SET_NETWORK_ERROR':
      return { ...state, networkError: action.payload };
    case 'RESET_FORM':
      return {
        ...state,
        editForm: action.payload,
        formErrors: {},
        isDirty: false,
      };
    case 'INITIALIZE_FORM':
      return {
        ...state,
        editForm: action.payload,
        initialForm: action.payload,
        isDirty: false,
        formErrors: {},
      };
    default:
      return state;
  }
};

// Debounce utility
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const AdminProfileScreen: React.FC = () => {
  const navigation = useNavigation<AdminProfileScreenNavigationProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const walkthrough = useOptionalAdminWalkthrough();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(12)).current;
  // Debounced form values for validation
  const debouncedBusinessName = useDebounce(state.editForm.businessName, 500);
  const debouncedName = useDebounce(state.editForm.name, 500);
  const debouncedEmail = useDebounce(state.editForm.email, 500);
  const debouncedPhone = useDebounce(state.editForm.phone, 500);

  // Initialize form when user data is available
  useEffect(() => {
    if (user && isAdminUser(user)) {
      const initialForm: FormState = {
        businessName: user.businessName || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      };
      dispatch({ type: 'INITIALIZE_FORM', payload: initialForm });
    }
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroTranslateY]);

  // Track dirty state
  useEffect(() => {
    if (!state.isEditing || !user || !state.initialForm) return;
    
    const hasChanges = 
      state.editForm.businessName.trim() !== (state.initialForm.businessName || '') ||
      state.editForm.name.trim() !== (state.initialForm.name || '') ||
      state.editForm.email.trim() !== (state.initialForm.email || '') ||
      state.editForm.phone.trim() !== (state.initialForm.phone || '');
    
    dispatch({ type: 'SET_DIRTY', payload: hasChanges });
  }, [state.editForm, state.isEditing, user, state.initialForm]);

  // Real-time validation with debouncing
  useEffect(() => {
    if (!state.isEditing) return;

    const errors: FormErrors = { ...state.formErrors };

    // Validate business name
    if (debouncedBusinessName.trim()) {
      const trimmed = debouncedBusinessName.trim();
      if (trimmed.length < 2) {
        errors.businessName = 'Business name must be at least 2 characters long';
      } else if (trimmed.length > 100) {
        errors.businessName = 'Business name must be less than 100 characters';
      } else {
        delete errors.businessName;
      }
    }

    // Validate name
    if (debouncedName.trim()) {
      const nameValidation = ValidationUtils.validateName(debouncedName.trim());
      if (!nameValidation.isValid) {
        errors.name = nameValidation.error ?? 'Invalid name';
      } else {
        delete errors.name;
      }
    }

    // Validate email
    if (debouncedEmail.trim()) {
      const emailValidation = ValidationUtils.validateEmail(debouncedEmail.trim());
      if (!emailValidation.isValid) {
        errors.email = emailValidation.error ?? 'Invalid email';
      } else {
        delete errors.email;
      }
    }

    // Validate phone (required)
    const phoneValidation = ValidationUtils.validatePhone(debouncedPhone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error ?? 'Invalid phone';
    } else {
      delete errors.phone;
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, [debouncedBusinessName, debouncedName, debouncedEmail, debouncedPhone, state.isEditing]);



  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Validate business name
    const businessNameTrimmed = state.editForm.businessName.trim();
    if (!businessNameTrimmed) {
      errors.businessName = 'Business name is required';
    } else if (businessNameTrimmed.length < 2) {
      errors.businessName = 'Business name must be at least 2 characters long';
    } else if (businessNameTrimmed.length > 100) {
      errors.businessName = 'Business name must be less than 100 characters';
    }

    // Validate name
    const nameValidation = ValidationUtils.validateName(state.editForm.name.trim());
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error ?? 'Invalid name';
    }

    // Validate email
    const emailValidation = ValidationUtils.validateEmail(state.editForm.email.trim());
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error ?? 'Invalid email';
    }

    // Validate phone (required)
    const phoneValidation = ValidationUtils.validatePhone(state.editForm.phone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error ?? 'Invalid phone';
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user || !isAdminUser(user)) return;
    
    // Validate all fields
    if (!validateForm()) {
      // Announce validation errors to screen readers
      AccessibilityInfo.announceForAccessibility('Please fix the errors in the form before saving.');
      return;
    }
    
    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_NETWORK_ERROR', payload: null });
    
    try {
      // Sanitize inputs
      const sanitizedEmail = SanitizationUtils.sanitizeEmail(state.editForm.email.trim());
      const sanitizedPhone = SanitizationUtils.sanitizePhone(state.editForm.phone.trim());
      
      const updates: Partial<User> = {
        businessName: state.editForm.businessName.trim(),
        name: state.editForm.name.trim(),
        email: sanitizedEmail,
        phone: sanitizedPhone,
      } as Partial<User>;
      
      await updateUser(updates);
      animateSectionLayout();
      dispatch({ type: 'SET_EDITING', payload: false });
      dispatch({ type: 'SET_DIRTY', payload: false });
      dispatch({ type: 'SET_ERRORS', payload: {} });
      
      // Announce success to screen readers
      AccessibilityInfo.announceForAccessibility('Profile updated successfully');
      
      // Show success alert
      Alert.alert('Success!', 'Your profile has been updated successfully.');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to update profile. Please try again.');
      
      // Check if it's a network error
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        dispatch({ type: 'SET_NETWORK_ERROR', payload: 'Network error. Please check your connection and try again.' });
      } else {
        dispatch({ type: 'SET_NETWORK_ERROR', payload: errorMessage });
      }
      
      Alert.alert('Error', errorMessage);
      AccessibilityInfo.announceForAccessibility(`Error: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              const errorMessage = getErrorMessage(error, 'Failed to logout. Please try again.');
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? The action cannot be reversed and all your data (profile, bank accounts, expenses) will be deleted permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsDeleting(true);
            try {
              const result = await AuthService.deleteAdminAccount(user.id);
              if (result.success) {
                return;
              }
              Alert.alert('Error', result.error ?? 'Failed to delete account.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    if (state.isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (user && isAdminUser(user) && state.initialForm) {
                const resetForm: FormState = {
                  businessName: user.businessName || '',
                  name: user.name || '',
                  email: user.email || '',
                  phone: user.phone || '',
                };
                animateSectionLayout();
                dispatch({ type: 'RESET_FORM', payload: resetForm });
                dispatch({ type: 'SET_EDITING', payload: false });
                AccessibilityInfo.announceForAccessibility('Changes discarded');
              }
            },
          },
        ]
      );
    } else {
      if (user && isAdminUser(user) && state.initialForm) {
        const resetForm: FormState = {
          businessName: user.businessName || '',
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
        };
        dispatch({ type: 'RESET_FORM', payload: resetForm });
      }
      animateSectionLayout();
      dispatch({ type: 'SET_EDITING', payload: false });
    }
  };

  const handleStartEdit = () => {
    animateSectionLayout();
    dispatch({ type: 'SET_EDITING', payload: true });
    AccessibilityInfo.announceForAccessibility('Edit profile mode activated');
  };

  const handleInputChange = useCallback((field: keyof FormState, value: string) => {
    // Trim input on change for better UX
    let trimmedValue = value;
    if (field === 'phone') {
      trimmedValue = value.replace(/\s/g, '');
    } else if (field === 'email') {
      trimmedValue = value.trim().toLowerCase();
    }
    dispatch({ type: 'UPDATE_FIELD', field, value: trimmedValue });
    
    // Clear error for this field when user starts typing
    if (state.formErrors[field as keyof FormErrors]) {
      dispatch({ type: 'CLEAR_ERROR', field: field as keyof FormErrors });
    }
  }, [state.formErrors]);

  const handleMenuNavigate = useCallback(
    (route: AdminRoute) => {
      if (route === 'Profile') {
        dispatch({ type: 'SET_MENU_VISIBLE', payload: false });
        return;
      }
      navigation.navigate(route);
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Typography variant="body" style={styles.loadingText}>
            Loading profile...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Typography variant="h3">Profile Not Found</Typography>
          <Typography variant="body" style={styles.loadingText}>Try logging in again.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => dispatch({ type: 'SET_MENU_VISIBLE', payload: true })}
              activeOpacity={0.7}
              accessibilityLabel="Open menu"
              accessibilityHint="Opens the navigation menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.headerTitle} accessibilityRole="header">Profile</Typography>
            </View>
          </View>
        </View>

        {isAdminUser(user) && (
          <>
            <Animated.View
              style={[
                styles.heroWrap,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroTranslateY }],
                },
              ]}
            >
              <Card style={styles.heroCard} padding="large">
                <ProfileHeader user={user} />
                <View style={styles.heroDivider} />
                <WalkthroughTarget id="profile.subscription">
                  <AdminSubscriptionCard userId={user.id} navigation={navigation} />
                </WalkthroughTarget>
              </Card>
            </Animated.View>

            <View style={styles.section}>
              <SectionEyebrow title="Account" colors={colors} />
              <Card style={styles.sectionCard} padding="small">
                {state.isEditing ? (
                  <View style={styles.editFormWrap}>
                    <EditProfileForm
                      formData={state.editForm}
                      formErrors={state.formErrors}
                      isSaving={state.isSaving}
                      isDirty={state.isDirty}
                      onFieldChange={handleInputChange}
                      onSave={handleSaveProfile}
                      onCancel={handleCancelEdit}
                    />
                  </View>
                ) : (
                  <>
                    <SettingsRow
                      label="Edit profile"
                      onPress={handleStartEdit}
                      disabled={isDeleting}
                      colors={colors}
                    />
                    <View style={styles.rowDivider} />
                    <SettingsRow
                      label="Change password"
                      onPress={() => navigation.navigate('ChangePassword')}
                      disabled={isDeleting}
                      colors={colors}
                    />
                    {walkthrough ? (
                      <>
                        <View style={styles.rowDivider} />
                        <WalkthroughTarget id="profile.replay">
                          <SettingsRow
                            label="Replay walkthrough"
                            onPress={() => walkthrough.startReplay()}
                            disabled={isDeleting}
                            colors={colors}
                          />
                        </WalkthroughTarget>
                      </>
                    ) : null}
                  </>
                )}
                {state.networkError ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <Typography variant="caption" style={styles.networkErrorText}>
                      {state.networkError}
                    </Typography>
                  </View>
                ) : null}
              </Card>
            </View>

            {!state.isEditing && (
              <View style={styles.section}>
                <Card style={styles.sectionCard} padding="medium">
                  <AppearanceSettingsSection />
                </Card>
              </View>
            )}

            {!state.isEditing && (
              <View style={styles.section}>
                <SectionEyebrow title="Security" colors={colors} />
                <Card style={styles.sectionCard} padding="small">
                  <TouchableOpacity
                    style={styles.destructiveRow}
                    onPress={handleDeleteAccountPress}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                    accessibilityLabel={isDeleting ? 'Deleting account' : 'Delete account'}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Typography variant="body" style={styles.destructiveLabel}>
                      {isDeleting ? 'Deleting account...' : 'Delete account'}
                    </Typography>
                  </TouchableOpacity>
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <AdminMenuDrawer
        visible={state.menuVisible}
        onClose={() => dispatch({ type: 'SET_MENU_VISIBLE', payload: false })}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Profile"
      />
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  heroWrap: {
    marginHorizontal: UI_CONFIG.spacing.md,
    marginTop: UI_CONFIG.spacing.md,
  },
  heroCard: {
    overflow: 'hidden',
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: UI_CONFIG.spacing.md,
  },
  section: {
    marginHorizontal: UI_CONFIG.spacing.md,
    marginTop: UI_CONFIG.spacing.lg,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: UI_CONFIG.spacing.md,
  },
  editFormWrap: {
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingBottom: UI_CONFIG.spacing.sm,
  },
  destructiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  destructiveLabel: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingBottom: UI_CONFIG.spacing.sm,
    marginTop: UI_CONFIG.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  networkErrorText: {
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
});
}

export default AdminProfileScreen;


