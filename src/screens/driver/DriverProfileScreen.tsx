import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Typography, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { DriverUser } from '../../types';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';

type DriverProfileScreenNavigationProp = StackNavigationProp<DriverStackParamList, 'Profile'>;

interface DriverProfileScreenProps {
  navigation: DriverProfileScreenNavigationProp;
}

const DriverProfileScreen: React.FC<DriverProfileScreenProps> = ({ navigation }) => {
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const editFormOpacity = useRef(new Animated.Value(0)).current;
  const editFormTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Reset and replay animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
      
      // Reset edit form animation values if not editing
      if (!isEditing) {
        editFormOpacity.setValue(0);
        editFormTranslateY.setValue(20);
      }

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim, scaleAnim, editFormOpacity, editFormTranslateY, isEditing])
  );

  useEffect(() => {
    if (isEditing) {
      Animated.parallel([
        Animated.timing(editFormOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(editFormTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(editFormOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(editFormTranslateY, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isEditing]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Sanitize inputs
    const sanitizedName = SanitizationUtils.sanitizeName(editForm.name);
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(editForm.email);
    const sanitizedPhone = editForm.phone ? SanitizationUtils.sanitizePhone(editForm.phone) : '';

    // Validate inputs
    const nameValidation = ValidationUtils.validateName(sanitizedName);
    const emailValidation = ValidationUtils.validateEmail(sanitizedEmail);
    const phoneValidation = sanitizedPhone ? ValidationUtils.validatePhone(sanitizedPhone) : { isValid: true };

    const errors: { name?: string; email?: string; phone?: string } = {};
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      await updateUser({
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone || undefined,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
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
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  const driverUser = user as DriverUser;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Menu */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <Typography variant="h2" style={styles.headerTitle}>
              Profile
            </Typography>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color={UI_CONFIG.colors.error} />
            </TouchableOpacity>
          </View>

          {/* Profile Header with Gradient */}
          <LinearGradient
            colors={[UI_CONFIG.colors.primary, UI_CONFIG.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={60} color={UI_CONFIG.colors.textLight} />
              </View>
              <View style={styles.headerSpacer} />
            </View>

            {/* Profile Section */}
            <Animated.View 
              style={[
                styles.profileSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <Typography variant="h2" style={styles.userName}>
                {user.name}
              </Typography>
              <Typography variant="body" style={styles.userEmail}>
                {user.email}
              </Typography>
              {user.phone && (
                <Typography variant="body" style={styles.userPhone}>
                  {user.phone}
                </Typography>
              )}
            </Animated.View>
          </LinearGradient>

          {/* Profile Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={20} color={UI_CONFIG.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Typography variant="caption" style={styles.infoLabel}>
                  Member Since
                </Typography>
                <Typography variant="body" style={styles.infoValue}>
                  {formatDate(user.createdAt)}
                </Typography>
              </View>
            </View>
            
            {driverUser.vehicleNumber && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="car-outline" size={20} color={UI_CONFIG.colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Typography variant="caption" style={styles.infoLabel}>
                    Vehicle Number
                  </Typography>
                  <Typography variant="body" style={styles.infoValue}>
                    {driverUser.vehicleNumber}
                  </Typography>
                </View>
              </View>
            )}

            {driverUser.licenseNumber && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="card-outline" size={20} color={UI_CONFIG.colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Typography variant="caption" style={styles.infoLabel}>
                    License Number
                  </Typography>
                  <Typography variant="body" style={styles.infoValue}>
                    {driverUser.licenseNumber}
                  </Typography>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.actionButtonsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, isEditing && styles.actionButtonActive]}
              onPress={isEditing ? handleCancelEdit : handleEditProfile}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isEditing ? "close-circle" : "create-outline"} 
                size={22} 
                color={isEditing ? UI_CONFIG.colors.error : UI_CONFIG.colors.primary} 
              />
              <Typography variant="body" style={[
                styles.actionButtonText,
                isEditing && styles.actionButtonTextActive
              ]}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Typography>
            </TouchableOpacity>
          </Animated.View>

          {/* Edit Profile Form */}
          {isEditing && (
            <Animated.View
              style={[
                styles.editFormContainer,
                {
                  opacity: editFormOpacity,
                  transform: [{ translateY: editFormTranslateY }],
                },
              ]}
            >
              <View style={styles.editCard}>
                <View style={styles.editHeader}>
                  <Ionicons name="person-outline" size={24} color={UI_CONFIG.colors.primary} />
                  <Typography variant="h3" style={styles.editTitle}>
                    Edit Profile Information
                  </Typography>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="person" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Full Name
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.name && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.name}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizeName(text);
                      setEditForm(prev => ({ ...prev, name: sanitized }));
                      if (formErrors.name) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                  />
                  {formErrors.name && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.name}
                    </Typography>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="mail" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Email Address
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.email && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.email}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizeEmail(text);
                      setEditForm(prev => ({ ...prev, email: sanitized }));
                      if (formErrors.email) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your email address"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {formErrors.email && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.email}
                    </Typography>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="call" size={16} color={UI_CONFIG.colors.textSecondary} />
                    <Typography variant="body" style={styles.inputLabel}>
                      Phone Number (Optional)
                    </Typography>
                  </View>
                  <TextInput
                    style={[styles.textInput, formErrors.phone && { borderColor: UI_CONFIG.colors.error }]}
                    value={editForm.phone}
                    onChangeText={(text) => {
                      const sanitized = SanitizationUtils.sanitizePhone(text);
                      setEditForm(prev => ({ ...prev, phone: sanitized }));
                      if (formErrors.phone) {
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter your phone number (optional)"
                    placeholderTextColor={UI_CONFIG.colors.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {formErrors.phone && (
                    <Typography variant="caption" style={{ color: UI_CONFIG.colors.error, marginTop: 4 }}>
                      {formErrors.phone}
                    </Typography>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[UI_CONFIG.colors.primary, UI_CONFIG.colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={UI_CONFIG.colors.textLight} />
                    <Typography variant="body" style={styles.saveButtonText}>
                      Save Changes
                    </Typography>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  logoutButton: {
    padding: 8,
  },
  gradientHeader: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerSpacer: {
    height: 16,
  },
  profileSection: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: UI_CONFIG.colors.textLight,
    marginBottom: 4,
    opacity: 0.9,
  },
  userPhone: {
    fontSize: 16,
    color: UI_CONFIG.colors.textLight,
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.primary,
  },
  actionButtonActive: {
    borderColor: UI_CONFIG.colors.error,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.primary,
  },
  actionButtonTextActive: {
    color: UI_CONFIG.colors.error,
  },
  editFormContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  editCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  editTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
  },
  textInput: {
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  bottomSpacing: {
    height: 24,
  },
});

export default DriverProfileScreen;

