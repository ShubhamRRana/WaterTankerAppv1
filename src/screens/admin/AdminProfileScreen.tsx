import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { ValidationUtils } from '../../utils/validation';

type AdminProfileScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Profile'>;

const AdminProfileScreen: React.FC = () => {
  const navigation = useNavigation<AdminProfileScreenNavigationProp>();
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<{
    businessName?: string;
    name?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initialFormRef = useRef<typeof editForm | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (user) {
      const initialForm = {
        businessName: user.businessName || '',
        name: user.name || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
      };
      setEditForm(initialForm);
      initialFormRef.current = initialForm;
      setIsDirty(false);
      setFormErrors({});
    }
  }, [user]);

  // Track dirty state
  useEffect(() => {
    if (!isEditing || !user || !initialFormRef.current) return;
    
    const hasChanges = 
      editForm.businessName.trim() !== (initialFormRef.current.businessName || '') ||
      editForm.name.trim() !== (initialFormRef.current.name || '') ||
      editForm.phone.trim() !== (initialFormRef.current.phone || '') ||
      editForm.password !== '' ||
      editForm.confirmPassword !== '';
    
    setIsDirty(hasChanges);
  }, [editForm, isEditing, user]);

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    // Validate business name
    const businessNameTrimmed = editForm.businessName.trim();
    if (!businessNameTrimmed) {
      errors.businessName = 'Business name is required';
    } else if (businessNameTrimmed.length < 2) {
      errors.businessName = 'Business name must be at least 2 characters long';
    } else if (businessNameTrimmed.length > 100) {
      errors.businessName = 'Business name must be less than 100 characters';
    }

    // Validate name
    const nameValidation = ValidationUtils.validateName(editForm.name.trim());
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }

    // Validate phone
    const phoneValidation = ValidationUtils.validatePhone(editForm.phone.trim());
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    // Validate password if provided
    if (editForm.password || editForm.confirmPassword) {
      if (!editForm.password) {
        errors.password = 'Please enter a new password';
      } else {
        const passwordValidation = ValidationUtils.validatePassword(editForm.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.error;
        }
      }

      if (editForm.password && editForm.password !== editForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Validate all fields
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        businessName: editForm.businessName.trim(),
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
      };
      
      // Only update password if provided
      if (editForm.password) {
        updates.password = editForm.password; // In real app, this should be hashed
      }
      
      await updateUser(updates);
      setIsEditing(false);
      setIsDirty(false);
      setFormErrors({});
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
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
    if (isDirty) {
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
              if (user && initialFormRef.current) {
                setEditForm(initialFormRef.current);
                setFormErrors({});
                setIsDirty(false);
                setIsEditing(false);
              }
            },
          },
        ]
      );
    } else {
      if (user && initialFormRef.current) {
        setEditForm(initialFormRef.current);
        setFormErrors({});
      }
      setIsEditing(false);
    }
  };

  const handleInputChange = (field: keyof typeof editForm, value: string) => {
    // Trim input on change for better UX
    const trimmedValue = field === 'phone' ? value.replace(/\s/g, '') : value;
    setEditForm(prev => ({ ...prev, [field]: trimmedValue }));
    // Clear error for this field when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof formErrors];
        return newErrors;
      });
    }
  };

  const handleMenuNavigate = (route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile') => {
    if (route === 'Profile') {
      // Already on Profile, just close menu
      return;
    }
    navigation.navigate(route);
  };

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
              onPress={() => setMenuVisible(true)}
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
            {user.profileImage && !imageError ? (
              <Image 
                source={{ uri: user.profileImage }} 
                style={styles.avatar}
                onError={() => setImageError(true)}
                accessibilityLabel="Profile image"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Typography variant="h3" style={styles.avatarText}>
                  {getBusinessInitials(user.businessName || user.name || 'A')}
                </Typography>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Typography variant="h3" style={styles.userName}>{user.businessName || user.name}</Typography>
              <Typography variant="body" style={styles.userPhone}>{user.phone}</Typography>
            </View>
          </View>

          {!isEditing && (
            <Button 
              title="Edit Profile" 
              onPress={() => {
                setIsEditing(true);
                setImageError(false);
              }} 
              variant="primary"
            />
          )}
        </Card>

        {isEditing && (
          <Card style={styles.editCard}>
            <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Business Name</Typography>
              <TextInput
                style={[styles.textInput, formErrors.businessName && styles.textInputError]}
                value={editForm.businessName}
                onChangeText={(t) => handleInputChange('businessName', t)}
                placeholder="Enter business name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                accessibilityLabel="Business name input"
                accessibilityHint="Enter your business name"
                maxLength={100}
              />
              {formErrors.businessName && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.businessName}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Full Name</Typography>
              <TextInput
                style={[styles.textInput, formErrors.name && styles.textInputError]}
                value={editForm.name}
                onChangeText={(t) => handleInputChange('name', t)}
                placeholder="Enter full name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                accessibilityLabel="Full name input"
                accessibilityHint="Enter your full name"
                maxLength={50}
              />
              {formErrors.name && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.name}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Phone Number</Typography>
              <TextInput
                style={[styles.textInput, formErrors.phone && styles.textInputError]}
                value={editForm.phone}
                onChangeText={(t) => handleInputChange('phone', t)}
                placeholder="Enter phone number"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                accessibilityLabel="Phone number input"
                accessibilityHint="Enter your 10-digit phone number"
              />
              {formErrors.phone && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.phone}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Password</Typography>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, formErrors.password && styles.textInputError]}
                  value={editForm.password}
                  onChangeText={(t) => handleInputChange('password', t)}
                  placeholder="Leave blank to keep current"
                  placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  secureTextEntry={!showPassword}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter new password or leave blank to keep current"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color={UI_CONFIG.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {formErrors.password && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.password}
                </Typography>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Confirm Password</Typography>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, formErrors.confirmPassword && styles.textInputError]}
                  value={editForm.confirmPassword}
                  onChangeText={(t) => handleInputChange('confirmPassword', t)}
                  placeholder="Confirm new password"
                  placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  accessibilityLabel="Confirm password input"
                  accessibilityHint="Confirm your new password"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color={UI_CONFIG.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {formErrors.confirmPassword && (
                <Typography variant="caption" style={styles.errorText}>
                  {formErrors.confirmPassword}
                </Typography>
              )}
            </View>
            <View style={styles.row}>
              <Button 
                title="Cancel" 
                onPress={handleCancelEdit}
                variant="outline" 
                style={styles.rowButton}
                disabled={isSaving}
              />
              <Button 
                title={isSaving ? "Saving..." : "Save"} 
                onPress={handleSaveProfile} 
                variant="primary" 
                style={styles.rowButton}
                disabled={isSaving}
                loading={isSaving}
              />
            </View>
          </Card>
        )}

      </ScrollView>
      </KeyboardAvoidingView>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
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
});

export default AdminProfileScreen;


