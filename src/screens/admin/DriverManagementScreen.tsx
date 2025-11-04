import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, Card, Button, LoadingSpinner, Input } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { User } from '../../types';
import { ValidationUtils } from '../../utils/validation';
import { PricingUtils } from '../../utils/pricing';

// AddDriverModal component moved outside to prevent re-creation on every render
interface AddDriverModalProps {
  visible: boolean;
  onClose: () => void;
  formData: {
    name: string;
    phone: string;
    password: string;
    confirmPassword: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    licenseNumber: string;
    licenseExpiry: string;
  };
  formErrors: {[key: string]: string};
  isSubmitting: boolean;
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
}

const AddDriverModal: React.FC<AddDriverModalProps> = ({
  visible,
  onClose,
  formData,
  formErrors,
  isSubmitting,
  onFormChange,
  onSubmit,
  onReset,
  onDelete,
  isEditMode = false,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="fullScreen"
    transparent={false}
    onRequestClose={onClose}
  >
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Typography variant="h2" style={styles.modalTitle}>
          {isEditMode ? 'Edit Driver' : 'Add New Driver'}
        </Typography>
        {isEditMode && onDelete && (
          <TouchableOpacity
            style={[styles.headerDeleteButton, isSubmitting && styles.headerDeleteButtonDisabled]}
            onPress={onDelete}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color={isSubmitting ? UI_CONFIG.colors.textSecondary : UI_CONFIG.colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.detailCard}>
          <Typography variant="h3" style={styles.detailSectionTitle}>
            Driver Information
          </Typography>
          
          <View style={styles.formField}>
            <Input
              label="Full Name *"
              value={formData.name}
              onChangeText={(text) => onFormChange('name', text)}
              placeholder="Enter driver's full name"
              error={formErrors.name}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => onFormChange('phone', text)}
              placeholder="Enter 10-digit phone number"
              error={formErrors.phone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.formField}>
            <Input
              label={isEditMode ? "Password (leave blank to keep current)" : "Password *"}
              value={formData.password}
              onChangeText={(text) => onFormChange('password', text)}
              placeholder={isEditMode ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
              error={formErrors.password}
              secureTextEntry
            />
          </View>

          {(!isEditMode || formData.password) && (
            <View style={styles.formField}>
              <Input
                label="Confirm Password *"
                value={formData.confirmPassword}
                onChangeText={(text) => onFormChange('confirmPassword', text)}
                placeholder="Confirm your password"
                error={formErrors.confirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <View style={styles.formField}>
            <Input
              label="Emergency Contact Name *"
              value={formData.emergencyContactName}
              onChangeText={(text) => onFormChange('emergencyContactName', text)}
              placeholder="Enter emergency contact name"
              error={formErrors.emergencyContactName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="Emergency Contact Number *"
              value={formData.emergencyContactPhone}
              onChangeText={(text) => onFormChange('emergencyContactPhone', text)}
              placeholder="Enter 10-digit emergency contact number"
              error={formErrors.emergencyContactPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="License Number *"
              value={formData.licenseNumber}
              onChangeText={(text) => onFormChange('licenseNumber', text)}
              placeholder="Enter driver's license number"
              error={formErrors.licenseNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formField}>
            <Input
              label="License Expiry (DD/MM/YYYY) *"
              value={formData.licenseExpiry}
              onChangeText={(text) => onFormChange('licenseExpiry', text)}
              placeholder="e.g., 31/12/2026"
              error={formErrors.licenseExpiry}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        </Card>

        <View style={styles.modalActions}>
          <Button
            title={isSubmitting ? (isEditMode ? "Updating Driver..." : "Adding Driver...") : (isEditMode ? "Update Driver" : "Add Driver")}
            onPress={onSubmit}
            disabled={isSubmitting}
            style={styles.addDriverButton}
          />
          <Button
            title="Cancel"
            onPress={() => {
              onClose();
              onReset();
            }}
            style={styles.cancelButton}
            variant="outline"
          />
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.detailCard}>
            <Typography variant="h3" style={styles.detailSectionTitle}>
              Driver Information
            </Typography>
            
            <View style={styles.formField}>
              <Input
                label="Full Name *"
                value={formData.name}
                onChangeText={(text) => onFormChange('name', text)}
                placeholder="Enter driver's full name"
                error={formErrors.name}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Phone Number *"
                value={formData.phone}
                onChangeText={(text) => onFormChange('phone', text)}
                placeholder="Enter 10-digit phone number"
                error={formErrors.phone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label={isEditMode ? "Password (leave blank to keep current)" : "Password *"}
                value={formData.password}
                onChangeText={(text) => onFormChange('password', text)}
                placeholder={isEditMode ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                error={formErrors.password}
                secureTextEntry
              />
            </View>

            {(!isEditMode || formData.password) && (
              <View style={styles.formField}>
                <Input
                  label="Confirm Password *"
                  value={formData.confirmPassword}
                  onChangeText={(text) => onFormChange('confirmPassword', text)}
                  placeholder="Confirm your password"
                  error={formErrors.confirmPassword}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.formField}>
              <Input
                label="Emergency Contact Name *"
                value={formData.emergencyContactName}
                onChangeText={(text) => onFormChange('emergencyContactName', text)}
                placeholder="Enter emergency contact name"
                error={formErrors.emergencyContactName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Emergency Contact Number *"
                value={formData.emergencyContactPhone}
                onChangeText={(text) => onFormChange('emergencyContactPhone', text)}
                placeholder="Enter 10-digit emergency contact number"
                error={formErrors.emergencyContactPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="License Number *"
                value={formData.licenseNumber}
                onChangeText={(text) => onFormChange('licenseNumber', text)}
                placeholder="Enter driver's license number"
                error={formErrors.licenseNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="License Expiry (DD/MM/YYYY) *"
                value={formData.licenseExpiry}
                onChangeText={(text) => onFormChange('licenseExpiry', text)}
                placeholder="e.g., 31/12/2026"
                error={formErrors.licenseExpiry}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </Card>

          <View style={styles.modalActions}>
            <Button
              title={isSubmitting ? (isEditMode ? "Updating Driver..." : "Adding Driver...") : (isEditMode ? "Update Driver" : "Add Driver")}
              onPress={onSubmit}
              disabled={isSubmitting}
              style={styles.addDriverButton}
            />
            <Button
              title="Cancel"
              onPress={() => {
                onClose();
                onReset();
              }}
              style={styles.cancelButton}
              variant="outline"
            />
          </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  </Modal>
);

const DriverManagementScreen: React.FC = () => {
  const { users, fetchAllUsers, updateUser, addUser, deleteUser, isLoading } = useUserStore();
  const { user: currentUser, logout } = useAuthStore();
  const { bookings, fetchAllBookings } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  
  
  // Add/Edit Driver form state
  const [addDriverForm, setAddDriverForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    licenseNumber: '',
    licenseExpiry: '',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate driver statistics from bookings
  const calculateDriverStats = useCallback((driverId: string) => {
    const driverBookings = bookings.filter(
      booking => booking.driverId === driverId && booking.status === 'delivered'
    );
    
    const totalEarnings = driverBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const completedOrders = driverBookings.length;
    
    return { totalEarnings, completedOrders };
  }, [bookings]);

  // Enrich drivers with calculated statistics
  const drivers = useMemo(() => {
    return users
      .filter(user => user.role === 'driver')
      .map(driver => {
        const stats = calculateDriverStats(driver.uid);
        return {
          ...driver,
          totalEarnings: stats.totalEarnings,
          completedOrders: stats.completedOrders,
        };
      });
  }, [users, calculateDriverStats]);

  useEffect(() => {
    loadDrivers();
  }, []);

  // Update selectedDriver with enriched data when drivers/bookings change
  useEffect(() => {
    if (selectedDriver) {
      const updatedDriver = drivers.find(d => d.uid === selectedDriver.uid);
      if (updatedDriver && (
        updatedDriver.totalEarnings !== selectedDriver.totalEarnings ||
        updatedDriver.completedOrders !== selectedDriver.completedOrders
      )) {
        setSelectedDriver(updatedDriver);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, bookings]);

  const loadDrivers = async () => {
    try {
      await Promise.all([
        fetchAllUsers(),
        fetchAllBookings(),
      ]);
    } catch (error) {
      console.error('Failed to load drivers:', error);
      Alert.alert('Error', 'Failed to load drivers. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAllUsers(),
        fetchAllBookings(),
      ]);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    Alert.alert(
      'Approve Driver',
      'Are you sure you want to approve this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await updateUser(driverId, { isApproved: true });
              Alert.alert('Success', 'Driver approved successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve driver');
            }
          },
        },
      ]
    );
  };

  const handleRejectDriver = async (driverId: string) => {
    Alert.alert(
      'Reject Driver',
      'Are you sure you want to reject this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUser(driverId, { isApproved: false });
              Alert.alert('Success', 'Driver rejected successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject driver');
            }
          },
        },
      ]
    );
  };

  const toggleDriverAvailability = async (driverId: string, currentStatus: boolean) => {
    try {
      await updateUser(driverId, { isAvailable: !currentStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update driver availability');
    }
  };

  const validateAddDriverForm = (isEditMode: boolean = false) => {
    const errors: {[key: string]: string} = {};
    
    // Validate name
    const nameValidation = ValidationUtils.validateName(addDriverForm.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || 'Invalid name';
    }
    
    // Validate phone
    const phoneValidation = ValidationUtils.validatePhone(addDriverForm.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error || 'Invalid phone';
    }
    
    // Validate password (required for add, optional for edit)
    if (!isEditMode || addDriverForm.password) {
      const passwordValidation = ValidationUtils.validatePassword(addDriverForm.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.error || 'Invalid password';
      }
    }
    
    // Validate confirm password (only required when adding or when password is being changed)
    if (!isEditMode) {
      if (!addDriverForm.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (addDriverForm.password !== addDriverForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else if (addDriverForm.password && addDriverForm.password !== addDriverForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Emergency contact validation
    const ecNameValidation = ValidationUtils.validateName(addDriverForm.emergencyContactName);
    if (!ecNameValidation.isValid) {
      errors.emergencyContactName = ecNameValidation.error || 'Invalid name';
    }
    const ecPhoneValidation = ValidationUtils.validatePhone(addDriverForm.emergencyContactPhone);
    if (!ecPhoneValidation.isValid) {
      errors.emergencyContactPhone = ecPhoneValidation.error || 'Invalid phone';
    }

    // License number required
    if (!addDriverForm.licenseNumber.trim()) {
      errors.licenseNumber = 'License number is required';
    }

    // Validate license expiry: DD/MM/YYYY
    const expiryMatch = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (!expiryMatch) {
      errors.licenseExpiry = 'Use DD/MM/YYYY format';
    } else {
      const day = parseInt(expiryMatch[1], 10);
      const month = parseInt(expiryMatch[2], 10) - 1;
      const year = parseInt(expiryMatch[3], 10);
      const candidate = new Date(year, month, day);
      if (isNaN(candidate.getTime())) {
        errors.licenseExpiry = 'Invalid date';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDriver = useCallback(async () => {
    const isEditMode = editingDriver !== null;
    if (!validateAddDriverForm(isEditMode)) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!isEditMode) {
        // Check if phone number already exists (only for new drivers)
        const existingUser = users.find(user => user.phone === addDriverForm.phone);
        if (existingUser) {
          Alert.alert('Error', 'A user with this phone number already exists');
          setIsSubmitting(false);
          return;
        }
        
        await addUser({
          role: 'driver',
          name: addDriverForm.name.trim(),
          phone: addDriverForm.phone,
          password: addDriverForm.password, // In real app, this should be hashed
          isApproved: true, // Auto-approve when added by admin
          isAvailable: true,
          totalEarnings: 0,
          completedOrders: 0,
          createdByAdmin: true, // Mark as created by admin
          licenseNumber: addDriverForm.licenseNumber.trim(),
          emergencyContactName: addDriverForm.emergencyContactName.trim(),
          emergencyContactPhone: addDriverForm.emergencyContactPhone,
          licenseExpiry: (() => {
            const m = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
            if (!m) return undefined as any;
            const d = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            const y = parseInt(m[3], 10);
            return new Date(y, mo, d);
          })(),
        });
        
        Alert.alert('Success', 'Driver added successfully');
      } else {
        // Check if phone number was changed and if it already exists for another user
        if (addDriverForm.phone !== editingDriver.phone) {
          const existingUser = users.find(user => user.phone === addDriverForm.phone && user.uid !== editingDriver.uid);
          if (existingUser) {
            Alert.alert('Error', 'A user with this phone number already exists');
            setIsSubmitting(false);
            return;
          }
        }
        
        // Update existing driver
        const updateData: any = {
          name: addDriverForm.name.trim(),
          phone: addDriverForm.phone,
          licenseNumber: addDriverForm.licenseNumber.trim(),
          emergencyContactName: addDriverForm.emergencyContactName.trim(),
          emergencyContactPhone: addDriverForm.emergencyContactPhone,
          licenseExpiry: (() => {
            const m = addDriverForm.licenseExpiry.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
            if (!m) return undefined as any;
            const d = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            const y = parseInt(m[3], 10);
            return new Date(y, mo, d);
          })(),
        };
        
        // Only update password if provided
        if (addDriverForm.password) {
          updateData.password = addDriverForm.password; // In real app, this should be hashed
        }
        
        await updateUser(editingDriver.uid, updateData);
        
        Alert.alert('Success', 'Driver updated successfully');
      }
      
      // Reset form
      setAddDriverForm({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        licenseNumber: '',
        licenseExpiry: '',
      });
      setFormErrors({});
      setEditingDriver(null);
      setShowAddDriverModal(false);
    } catch (error) {
      Alert.alert('Error', isEditMode ? 'Failed to update driver. Please try again.' : 'Failed to add driver. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [addDriverForm, users, addUser, updateUser, editingDriver]);

  const resetAddDriverForm = useCallback(() => {
    setAddDriverForm({
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      licenseNumber: '',
      licenseExpiry: '',
    });
    setFormErrors({});
    setEditingDriver(null);
  }, []);

  const handleEditDriver = useCallback((driver: User) => {
    setEditingDriver(driver);
    setAddDriverForm({
      name: driver.name || '',
      phone: driver.phone || '',
      password: '',
      confirmPassword: '',
      emergencyContactName: driver.emergencyContactName || '',
      emergencyContactPhone: driver.emergencyContactPhone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? (() => {
        const date = new Date(driver.licenseExpiry);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      })() : '',
    });
    setFormErrors({});
    setShowAddDriverModal(true);
  }, []);

  const handleDeleteDriver = useCallback(async () => {
    if (!editingDriver) return;

    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${editingDriver.name}? This action cannot be undone and the driver will no longer be able to login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const driverId = editingDriver.uid;
              const driverPhone = editingDriver.phone;
              
              // Delete the driver
              await deleteUser(driverId);
              
              // Check if the deleted driver is currently logged in
              if (currentUser && (currentUser.uid === driverId || currentUser.phone === driverPhone)) {
                // Logout the deleted driver
                await logout();
                Alert.alert(
                  'Driver Deleted',
                  'The driver account has been deleted. You have been logged out as this account no longer exists.'
                );
              } else {
                Alert.alert('Success', 'Driver deleted successfully');
              }
              
              // Close modal and reset form
              setEditingDriver(null);
              setShowAddDriverModal(false);
              resetAddDriverForm();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete driver. Please try again.');
            }
          },
        },
      ]
    );
  }, [editingDriver, deleteUser, currentUser, logout, resetAddDriverForm]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setAddDriverForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         driver.phone.includes(searchQuery) ||
                         driver.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (driver: User) => {
    if (driver.isApproved === true) return UI_CONFIG.colors.success;
    if (driver.isApproved === false) return UI_CONFIG.colors.error;
    return UI_CONFIG.colors.warning;
  };

  const getStatusText = (driver: User) => {
    if (driver.isApproved === true) return 'Approved';
    if (driver.isApproved === false) return 'Rejected';
    return 'Pending';
  };

  const DriverCard: React.FC<{ driver: User }> = ({ driver }) => (
    <Card style={styles.driverCard}>
      <TouchableOpacity 
        style={styles.driverCardContent}
        onPress={() => {
          if (showDriverModal) return;
          setSelectedDriver(driver);
          setShowDriverModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <Typography variant="h3" style={styles.driverName}>
              {driver.name}
            </Typography>
            <Typography variant="body" style={styles.driverPhone}>
              {driver.phone}
            </Typography>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditDriver(driver);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={UI_CONFIG.colors.success} />
          </TouchableOpacity>
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.detailText}>
              {driver.licenseNumber || 'Not provided'}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.detailText}>
              {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : 'Expiry not provided'}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.detailText}>
              {driver.emergencyContactName ? `${driver.emergencyContactName} - ${driver.emergencyContactPhone}` : 'Emergency contact not provided'}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.detailText}>
              {PricingUtils.formatPrice(driver.totalEarnings || 0)} earned
            </Typography>
          </View>
        </View>

        <View style={styles.driverActions}>
          {driver.isApproved === undefined && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApproveDriver(driver.uid)}
              >
                <Ionicons name="checkmark" size={16} color={UI_CONFIG.colors.textLight} />
                <Typography variant="caption" style={styles.actionButtonText}>
                  Approve
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectDriver(driver.uid)}
              >
                <Ionicons name="close" size={16} color={UI_CONFIG.colors.textLight} />
                <Typography variant="caption" style={styles.actionButtonText}>
                  Reject
                </Typography>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

  const DriverModal: React.FC = () => (
    <Modal
      visible={showDriverModal}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={() => setShowDriverModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Typography variant="h2" style={styles.modalTitle}>
            Driver Details
          </Typography>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowDriverModal(false);
            }}
          >
            <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
        </View>

        {selectedDriver && (
          <ScrollView style={styles.modalContent}>
              <>
                <Card style={styles.detailCard}>
                  <Typography variant="h3" style={styles.detailSectionTitle}>
                    Personal Information
                  </Typography>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Name</Typography>
                    <Typography variant="body" style={styles.detailValue}>{selectedDriver.name}</Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Phone</Typography>
                    <Typography variant="body" style={styles.detailValue}>{selectedDriver.phone}</Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Emergency Contact</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {selectedDriver.emergencyContactName || 'Not provided'}
                    </Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Emergency Number</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {selectedDriver.emergencyContactPhone || 'Not provided'}
                    </Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Joined</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {new Date(selectedDriver.createdAt).toLocaleDateString()}
                    </Typography>
                  </View>
                </Card>

                <Card style={styles.detailCard}>
                  <Typography variant="h3" style={styles.detailSectionTitle}>
                    License Information
                  </Typography>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>License Number</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {selectedDriver.licenseNumber || 'Not provided'}
                    </Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Expiry Date</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {selectedDriver.licenseExpiry ? new Date(selectedDriver.licenseExpiry).toLocaleDateString() : 'Not provided'}
                    </Typography>
                  </View>
                </Card>

                <Card style={styles.detailCard}>
                  <Typography variant="h3" style={styles.detailSectionTitle}>
                    Performance
                  </Typography>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Total Earnings</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {PricingUtils.formatPrice(selectedDriver.totalEarnings || 0)}
                    </Typography>
                  </View>
                  <View style={styles.detailItem}>
                    <Typography variant="body" style={styles.detailLabel}>Completed Orders</Typography>
                    <Typography variant="body" style={styles.detailValue}>
                      {selectedDriver.completedOrders || 0}
                    </Typography>
                  </View>
                </Card>

                {selectedDriver.isApproved === undefined && (
                  <View style={styles.modalActions}>
                    <Button
                      title="Approve Driver"
                      onPress={() => {
                        setShowDriverModal(false);
                        handleApproveDriver(selectedDriver.uid);
                      }}
                      style={styles.approveButtonLarge}
                    />
                    <Button
                      title="Reject Driver"
                      onPress={() => {
                        setShowDriverModal(false);
                        handleRejectDriver(selectedDriver.uid);
                      }}
                      style={styles.rejectButtonLarge}
                    />
                  </View>
                )}
              </>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );


  

  if (isLoading && drivers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading drivers...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        scrollEnabled={!showDriverModal && !showAddDriverModal}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2" style={styles.title}>
            Driver Management
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Manage driver accounts and approvals
          </Typography>
        </View>

        

        {/* Search */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={UI_CONFIG.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search drivers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={UI_CONFIG.colors.textSecondary}
            />
          </View>
        </View>

        {/* Drivers List */}
        <View style={styles.driversSection} pointerEvents={(showDriverModal || showAddDriverModal) ? 'none' : 'auto'}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Drivers ({filteredDrivers.length})
          </Typography>
          
          {filteredDrivers.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyText}>
                {searchQuery 
                  ? 'No drivers found matching your criteria'
                  : 'No drivers registered yet'
                }
              </Typography>
            </Card>
          ) : (
            filteredDrivers.map((driver) => (
              <DriverCard key={driver.uid} driver={driver} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Driver Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddDriverModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={UI_CONFIG.colors.textLight} />
      </TouchableOpacity>

      <DriverModal />
      <AddDriverModal 
        visible={showAddDriverModal}
        onClose={() => setShowAddDriverModal(false)}
        formData={addDriverForm}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onFormChange={handleFormChange}
        onSubmit={handleAddDriver}
        onReset={resetAddDriverForm}
        onDelete={handleDeleteDriver}
        isEditMode={editingDriver !== null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  statsSection: {
    padding: UI_CONFIG.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: UI_CONFIG.spacing.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginTop: 0,
  },
  filterSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    marginTop: UI_CONFIG.spacing.lg,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.sm,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  filterScroll: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    marginRight: UI_CONFIG.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
  },
  driversSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  driverCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  driverCardContent: {
    padding: UI_CONFIG.spacing.md,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  editButton: {
    padding: 8,
    borderWidth: 1.5,
    borderColor: UI_CONFIG.colors.success,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  driverDetails: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginRight: UI_CONFIG.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: UI_CONFIG.spacing.xs,
    borderRadius: 6,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  approveButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
  rejectButton: {
    backgroundColor: UI_CONFIG.colors.error,
  },
  actionButtonText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.md,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingTop: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  headerDeleteButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  headerDeleteButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: UI_CONFIG.spacing.lg,
  },
  detailCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.background,
  },
  detailLabel: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: UI_CONFIG.spacing.md,
  },
  modalActions: {
    marginTop: UI_CONFIG.spacing.lg,
  },
  approveButtonLarge: {
    backgroundColor: UI_CONFIG.colors.success,
    marginBottom: UI_CONFIG.spacing.md,
  },
  rejectButtonLarge: {
    backgroundColor: UI_CONFIG.colors.error,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  formField: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  addDriverButton: {
    backgroundColor: UI_CONFIG.colors.primary,
    marginBottom: UI_CONFIG.spacing.md,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: UI_CONFIG.colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: UI_CONFIG.spacing.md,
  },
  deleteButtonDisabled: {
    backgroundColor: UI_CONFIG.colors.textSecondary,
  },
  deleteButtonText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DriverManagementScreen;
