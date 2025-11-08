import React, { useEffect, useState, useRef, useReducer, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner, AdminMenuDrawer, SuccessNotification } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { ValidationUtils } from '../../utils/validation';

type AdminProfileScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Profile'>;

// Form state interface
interface FormState {
  businessName: string;
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  businessName?: string;
  name?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

interface AppState {
  isEditing: boolean;
  editForm: FormState;
  formErrors: FormErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSaving: boolean;
  imageError: boolean;
  imageLoading: boolean;
  isDirty: boolean;
  menuVisible: boolean;
  showSuccessNotification: boolean;
  networkError: string | null;
  initialForm: FormState | null;
}

type AppAction =
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string }
  | { type: 'SET_ERRORS'; payload: FormErrors }
  | { type: 'CLEAR_ERROR'; field: keyof FormErrors }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY' }
  | { type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_IMAGE_ERROR'; payload: boolean }
  | { type: 'SET_IMAGE_LOADING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_MENU_VISIBLE'; payload: boolean }
  | { type: 'SET_SUCCESS_NOTIFICATION'; payload: boolean }
  | { type: 'SET_NETWORK_ERROR'; payload: string | null }
  | { type: 'RESET_FORM'; payload: FormState }
  | { type: 'INITIALIZE_FORM'; payload: FormState };

const initialState: AppState = {
  isEditing: false,
  editForm: {
    businessName: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  },
  formErrors: {},
  showPassword: false,
  showConfirmPassword: false,
  isSaving: false,
  imageError: false,
  imageLoading: true,
  isDirty: false,
  menuVisible: false,
  showSuccessNotification: false,
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
    case 'TOGGLE_PASSWORD_VISIBILITY':
      return { ...state, showPassword: !state.showPassword };
    case 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY':
      return { ...state, showConfirmPassword: !state.showConfirmPassword };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_IMAGE_ERROR':
      return { ...state, imageError: action.payload };
    case 'SET_IMAGE_LOADING':
      return { ...state, imageLoading: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SET_MENU_VISIBLE':
      return { ...state, menuVisible: action.payload };
    case 'SET_SUCCESS_NOTIFICATION':
      return { ...state, showSuccessNotification: action.payload };
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
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const businessNameInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Debounced form values for validation
  const debouncedBusinessName = useDebounce(state.editForm.businessName, 500);
  const debouncedName = useDebounce(state.editForm.name, 500);
  const debouncedPhone = useDebounce(state.editForm.phone, 500);
  const debouncedPassword = useDebounce(state.editForm.password, 500);

  // Initialize form when user data is available
  useEffect(() => {
    if (user) {
      const initialForm: FormState = {
        businessName: user.businessName || '',
        name: user.name || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
      };
      dispatch({ type: 'INITIALIZE_FORM', payload: initialForm });
      dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
    }
  }, [user]);

  // Track dirty state
  useEffect(() => {
    if (!state.isEditing || !user || !state.initialForm) return;
    
    const hasChanges = 
      state.editForm.businessName.trim() !== (state.initialForm.businessName || '') ||
      state.editForm.name.trim() !== (state.initialForm.name || '') ||
      state.editForm.phone.trim() !== (state.initialForm.phone || '') ||
      (state.editForm.password !== '' && state.editForm.password.trim() !== '') ||
      (state.editForm.confirmPassword !== '' && state.editForm.confirmPassword.trim() !== '');
    
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
        errors.name = nameValidation.error;
      } else {
        delete errors.name;
      }
    }

    // Validate phone
    if (debouncedPhone.trim()) {
      const phoneValidation = ValidationUtils.validatePhone(debouncedPhone.trim());
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error;
      } else {
        delete errors.phone;
      }
    }

    // Validate password if provided
    if (debouncedPassword) {
      const passwordValidation = ValidationUtils.validatePassword(debouncedPassword);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error;
      } else {
        delete errors.password;
      }
    }

    if (state.editForm.password && state.editForm.password !== state.editForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    } else if (state.editForm.confirmPassword && state.editForm.password === state.editForm.confirmPassword) {
      delete errors.confirmPassword;
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, [debouncedBusinessName, debouncedName, debouncedPhone, debouncedPassword, state.editForm.password, state.editForm.confirmPassword, state.isEditing]);

  // Auto-focus first input when entering edit mode
  useEffect(() => {
    if (state.isEditing && businessNameInputRef.current) {
      setTimeout(() => {
        businessNameInputRef.current?.focus();
      }, 100);
    }
  }, [state.isEditing]);

  // Success animation
  useEffect(() => {
    if (state.showSuccessNotification) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [state.showSuccessNotification]);

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
      errors.name = nameValidation.error;
    }

    // Validate phone
    const phoneValidation = ValidationUtils.validatePhone(state.editForm.phone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    // Validate password if provided
    if (state.editForm.password || state.editForm.confirmPassword) {
      if (!state.editForm.password) {
        errors.password = 'Please enter a new password';
      } else {
        const passwordValidation = ValidationUtils.validatePassword(state.editForm.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.error;
        }
      }

      if (state.editForm.password && state.editForm.password !== state.editForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    dispatch({ type: 'SET_ERRORS', payload: errors });
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Validate all fields
    if (!validateForm()) {
      // Announce validation errors to screen readers
      AccessibilityInfo.announceForAccessibility('Please fix the errors in the form before saving.');
      return;
    }
    
    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_NETWORK_ERROR', payload: null });
    
    try {
      const updates: Partial<User> = {
        businessName: state.editForm.businessName.trim(),
        name: state.editForm.name.trim(),
        phone: state.editForm.phone.trim(),
      };
      
      // Only update password if provided
      if (state.editForm.password) {
        updates.password = state.editForm.password; // In real app, this should be hashed
      }
      
      await updateUser(updates);
      dispatch({ type: 'SET_EDITING', payload: false });
      dispatch({ type: 'SET_DIRTY', payload: false });
      dispatch({ type: 'SET_ERRORS', payload: {} });
      dispatch({ type: 'SET_SUCCESS_NOTIFICATION', payload: true });
      
      // Announce success to screen readers
      AccessibilityInfo.announceForAccessibility('Profile updated successfully');
      
      // Auto-hide success notification after 3 seconds
      setTimeout(() => {
        dispatch({ type: 'SET_SUCCESS_NOTIFICATION', payload: false });
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      
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
              const errorMessage = error instanceof Error ? error.message : 'Failed to logout. Please try again.';
              Alert.alert('Error', errorMessage);
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
              if (user && state.initialForm) {
                dispatch({ type: 'RESET_FORM', payload: state.initialForm });
                dispatch({ type: 'SET_EDITING', payload: false });
                AccessibilityInfo.announceForAccessibility('Changes discarded');
              }
            },
          },
        ]
      );
    } else {
      if (user && state.initialForm) {
        dispatch({ type: 'RESET_FORM', payload: state.initialForm });
      }
      dispatch({ type: 'SET_EDITING', payload: false });
    }
  };

  const handleInputChange = useCallback((field: keyof FormState, value: string) => {
    // Trim input on change for better UX
    const trimmedValue = field === 'phone' ? value.replace(/\s/g, '') : value;
    dispatch({ type: 'UPDATE_FIELD', field, value: trimmedValue });
    
    // Clear error for this field when user starts typing
    if (state.formErrors[field as keyof FormErrors]) {
      dispatch({ type: 'CLEAR_ERROR', field: field as keyof FormErrors });
    }
  }, [state.formErrors]);

  const handleMenuNavigate = useCallback((route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile') => {
    if (route === 'Profile') {
      // Already on Profile, just close menu
      dispatch({ type: 'SET_MENU_VISIBLE', payload: false });
      return;
    }
    navigation.navigate(route);
  }, [navigation]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBusinessInitials = (businessName: string) => {
    return businessName
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Character count helpers
  const getCharacterCount = (text: string, maxLength: number) => {
    return `${text.length}/${maxLength}`;
  };

  const getCharacterCountColor = (text: string, maxLength: number) => {
    const percentage = (text.length / maxLength) * 100;
    if (percentage >= 90) return UI_CONFIG.colors.error;
    if (percentage >= 75) return UI_CONFIG.colors.warning;
    return UI_CONFIG.colors.textSecondary;
  };

  const handleImageLoad = () => {
    dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
    dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
  };

  const handleImageError = () => {
    dispatch({ type: 'SET_IMAGE_ERROR', payload: true });
    dispatch({ type: 'SET_IMAGE_LOADING', payload: false });
  };

  const handleRetryImage = () => {
    dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
    dispatch({ type: 'SET_IMAGE_LOADING', payload: true });
  };

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
        {/* Header */}
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
              <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.headerTitle}>Profile</Typography>
            </View>
          </View>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user.profileImage && !state.imageError ? (
                <>
                  {state.imageLoading && (
                    <View style={styles.imageLoadingOverlay}>
                      <LoadingSpinner size="small" />
                    </View>
                  )}
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={styles.avatar}
                    onLoadStart={() => dispatch({ type: 'SET_IMAGE_LOADING', payload: true })}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    accessibilityLabel="Profile image"
                    accessibilityRole="image"
                  />
                </>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Typography variant="h3" style={styles.avatarText}>
                    {getBusinessInitials(user.businessName || user.name || 'A')}
                  </Typography>
                </View>
              )}
              {state.imageError && user.profileImage && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetryImage}
                  accessibilityLabel="Retry loading profile image"
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={16} color={UI_CONFIG.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Typography variant="h3" style={styles.userName}>{user.businessName || user.name}</Typography>
              <Typography variant="body" style={styles.userPhone}>{user.phone}</Typography>
            </View>
          </View>

          {!state.isEditing && (
            <Button 
              title="Edit Profile" 
              onPress={() => {
                dispatch({ type: 'SET_EDITING', payload: true });
                dispatch({ type: 'SET_IMAGE_ERROR', payload: false });
                AccessibilityInfo.announceForAccessibility('Edit profile mode activated');
              }} 
              variant="primary"
            />
          )}
        </Card>

        {state.networkError && (
          <Card style={styles.errorCard}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={UI_CONFIG.colors.error} />
              <Typography variant="body" style={styles.networkErrorText}>
                {state.networkError}
              </Typography>
            </View>
          </Card>
        )}

        {state.isEditing && (
          <Card style={styles.editCard}>
            <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Typography variant="body" style={styles.inputLabel}>Business Name</Typography>
                <Typography 
                  variant="caption" 
                  style={[
                    styles.characterCount, 
                    { color: getCharacterCountColor(state.editForm.businessName, 100) }
                  ]}
                >
                  {getCharacterCount(state.editForm.businessName, 100)}
                </Typography>
              </View>
              <TextInput
                ref={businessNameInputRef}
                style={[styles.textInput, state.formErrors.businessName && styles.textInputError]}
                value={state.editForm.businessName}
                onChangeText={(t) => handleInputChange('businessName', t)}
                placeholder="Enter business name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                accessibilityLabel="Business name input"
                accessibilityHint="Enter your business name. Maximum 100 characters."
                maxLength={100}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => nameInputRef.current?.focus()}
              />
              {state.formErrors.businessName && (
                <Typography variant="caption" style={styles.errorText}>
                  {state.formErrors.businessName}
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
                    { color: getCharacterCountColor(state.editForm.name, 50) }
                  ]}
                >
                  {getCharacterCount(state.editForm.name, 50)}
                </Typography>
              </View>
              <TextInput
                ref={nameInputRef}
                style={[styles.textInput, state.formErrors.name && styles.textInputError]}
                value={state.editForm.name}
                onChangeText={(t) => handleInputChange('name', t)}
                placeholder="Enter full name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                accessibilityLabel="Full name input"
                accessibilityHint="Enter your full name. Maximum 50 characters."
                maxLength={50}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneInputRef.current?.focus()}
              />
              {state.formErrors.name && (
                <Typography variant="caption" style={styles.errorText}>
                  {state.formErrors.name}
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
                    { color: getCharacterCountColor(state.editForm.phone, 10) }
                  ]}
                >
                  {getCharacterCount(state.editForm.phone, 10)}
                </Typography>
              </View>
              <TextInput
                ref={phoneInputRef}
                style={[styles.textInput, state.formErrors.phone && styles.textInputError]}
                value={state.editForm.phone}
                onChangeText={(t) => handleInputChange('phone', t)}
                placeholder="Enter phone number"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                accessibilityLabel="Phone number input"
                accessibilityHint="Enter your 10-digit phone number starting with 6-9"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              {state.formErrors.phone && (
                <Typography variant="caption" style={styles.errorText}>
                  {state.formErrors.phone}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Password</Typography>
              <View style={[
                styles.passwordInputContainer,
                state.formErrors.password && styles.textInputError
              ]}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  value={state.editForm.password}
                  onChangeText={(t) => handleInputChange('password', t)}
                  placeholder="Leave blank to keep current"
                  placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  secureTextEntry={!state.showPassword}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter new password or leave blank to keep current. Minimum 6 characters."
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => dispatch({ type: 'TOGGLE_PASSWORD_VISIBILITY' })}
                  accessibilityLabel={state.showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                  accessibilityHint="Toggles password visibility"
                >
                  <Ionicons
                    name={state.showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color={UI_CONFIG.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {state.formErrors.password && (
                <Typography variant="caption" style={styles.errorText}>
                  {state.formErrors.password}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Confirm Password</Typography>
              <View style={[
                styles.passwordInputContainer,
                state.formErrors.confirmPassword && styles.textInputError
              ]}>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.passwordInput}
                  value={state.editForm.confirmPassword}
                  onChangeText={(t) => handleInputChange('confirmPassword', t)}
                  placeholder="Confirm new password"
                  placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  secureTextEntry={!state.showConfirmPassword}
                  accessibilityLabel="Confirm password input"
                  accessibilityHint="Confirm your new password. Must match the password above."
                  returnKeyType="done"
                  onSubmitEditing={handleSaveProfile}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => dispatch({ type: 'TOGGLE_CONFIRM_PASSWORD_VISIBILITY' })}
                  accessibilityLabel={state.showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  accessibilityRole="button"
                  accessibilityHint="Toggles confirm password visibility"
                >
                  <Ionicons
                    name={state.showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color={UI_CONFIG.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {state.formErrors.confirmPassword && (
                <Typography variant="caption" style={styles.errorText}>
                  {state.formErrors.confirmPassword}
                </Typography>
              )}
            </View>
            <View style={styles.row}>
              <Button 
                title="Cancel" 
                onPress={handleCancelEdit}
                variant="outline" 
                style={styles.rowButton}
                disabled={state.isSaving}
              />
              <Button 
                title={state.isSaving ? "Saving..." : "Save"} 
                onPress={handleSaveProfile} 
                variant="primary" 
                style={styles.rowButton}
                disabled={state.isSaving || !state.isDirty}
                loading={state.isSaving}
              />
            </View>
          </Card>
        )}

        <SuccessNotification
          visible={state.showSuccessNotification}
          title="Success!"
          message="Your profile has been updated successfully."
          onClose={() => dispatch({ type: 'SET_SUCCESS_NOTIFICATION', payload: false })}
        />

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  userPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  editCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  textInputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: '#EF4444',
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
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  retryButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    zIndex: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: UI_CONFIG.colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkErrorText: {
    marginLeft: 8,
    color: UI_CONFIG.colors.error,
    flex: 1,
  },
});

export default AdminProfileScreen;


