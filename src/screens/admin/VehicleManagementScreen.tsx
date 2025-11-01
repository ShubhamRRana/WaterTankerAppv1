import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAuthStore } from '../../store/authStore';
import { Typography, Card, Button, LoadingSpinner, Input } from '../../components/common';
import { Vehicle } from '../../types';
import { UI_CONFIG } from '../../constants/config';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  formData: {
    vehicleNumber: string;
    insuranceCompanyName: string;
    insuranceExpiryDate: string;
    vehicleCapacity: string;
    amount: string;
  };
  formErrors: {[key: string]: string};
  isSubmitting: boolean;
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
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
          {isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}
        </Typography>
        {isEditMode && onDelete && (
          <TouchableOpacity
            style={[styles.headerDeleteButton, isSubmitting && styles.headerDeleteButtonDisabled]}
            onPress={onDelete}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color={isSubmitting ? "#8E8E93" : "#FF3B30"} />
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
                Vehicle Information
              </Typography>
              
              <View style={styles.formField}>
                <Input
                  label="Vehicle Number *"
                  value={formData.vehicleNumber}
                  onChangeText={(text) => onFormChange('vehicleNumber', text.toUpperCase())}
                  placeholder="Enter vehicle number (e.g., DL01AB1234)"
                  error={formErrors.vehicleNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Insurance Company Name *"
                  value={formData.insuranceCompanyName}
                  onChangeText={(text) => onFormChange('insuranceCompanyName', text)}
                  placeholder="Enter insurance company name"
                  error={formErrors.insuranceCompanyName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Insurance Expiry Date (DD/MM/YYYY) *"
                  value={formData.insuranceExpiryDate}
                  onChangeText={(text) => onFormChange('insuranceExpiryDate', text)}
                  placeholder="e.g., 31/12/2026"
                  error={formErrors.insuranceExpiryDate}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Vehicle Capacity (Liters) *"
                  value={formData.vehicleCapacity}
                  onChangeText={(text) => onFormChange('vehicleCapacity', text)}
                  placeholder="Enter vehicle capacity"
                  error={formErrors.vehicleCapacity}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Amount (₹) *"
                  value={formData.amount}
                  onChangeText={(text) => onFormChange('amount', text)}
                  placeholder="Enter amount"
                  error={formErrors.amount}
                  keyboardType="numeric"
                />
              </View>
            </Card>

            <View style={styles.modalActions}>
              <Button
                title={isSubmitting ? (isEditMode ? "Updating Vehicle..." : "Adding Vehicle...") : (isEditMode ? "Update Vehicle" : "Add Vehicle")}
                onPress={onSubmit}
                disabled={isSubmitting}
                style={styles.addVehicleButton}
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
                Vehicle Information
              </Typography>
              
              <View style={styles.formField}>
                <Input
                  label="Vehicle Number *"
                  value={formData.vehicleNumber}
                  onChangeText={(text) => onFormChange('vehicleNumber', text.toUpperCase())}
                  placeholder="Enter vehicle number (e.g., DL01AB1234)"
                  error={formErrors.vehicleNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Insurance Company Name *"
                  value={formData.insuranceCompanyName}
                  onChangeText={(text) => onFormChange('insuranceCompanyName', text)}
                  placeholder="Enter insurance company name"
                  error={formErrors.insuranceCompanyName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Insurance Expiry Date (DD/MM/YYYY) *"
                  value={formData.insuranceExpiryDate}
                  onChangeText={(text) => onFormChange('insuranceExpiryDate', text)}
                  placeholder="e.g., 31/12/2026"
                  error={formErrors.insuranceExpiryDate}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Vehicle Capacity (Liters) *"
                  value={formData.vehicleCapacity}
                  onChangeText={(text) => onFormChange('vehicleCapacity', text)}
                  placeholder="Enter vehicle capacity"
                  error={formErrors.vehicleCapacity}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Input
                  label="Amount (₹) *"
                  value={formData.amount}
                  onChangeText={(text) => onFormChange('amount', text)}
                  placeholder="Enter amount"
                  error={formErrors.amount}
                  keyboardType="numeric"
                />
              </View>
            </Card>

            <View style={styles.modalActions}>
              <Button
                title={isSubmitting ? (isEditMode ? "Updating Vehicle..." : "Adding Vehicle...") : (isEditMode ? "Update Vehicle" : "Add Vehicle")}
                onPress={onSubmit}
                disabled={isSubmitting}
                style={styles.addVehicleButton}
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

const VehicleManagementScreen: React.FC = () => {
  const { vehicles, fetchAllVehicles, updateVehicle, addVehicle, deleteVehicle, isLoading } = useVehicleStore();
  const { user: currentUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add/Edit Vehicle form state
  const [addVehicleForm, setAddVehicleForm] = useState({
    vehicleNumber: '',
    insuranceCompanyName: '',
    insuranceExpiryDate: '',
    vehicleCapacity: '',
    amount: '',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      await fetchAllVehicles();
      // Filter to show only vehicles for current admin
      if (currentUser && currentUser.role === 'admin') {
        // Vehicles are already filtered in the component based on agencyId
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const validateVehicleForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!addVehicleForm.vehicleNumber.trim()) {
      errors.vehicleNumber = 'Vehicle number is required';
    }
    
    if (!addVehicleForm.insuranceCompanyName.trim()) {
      errors.insuranceCompanyName = 'Insurance company name is required';
    }

    // Validate insurance expiry date: DD/MM/YYYY
    const expiryMatch = addVehicleForm.insuranceExpiryDate.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (!expiryMatch) {
      errors.insuranceExpiryDate = 'Use DD/MM/YYYY format';
    } else {
      const day = parseInt(expiryMatch[1], 10);
      const month = parseInt(expiryMatch[2], 10) - 1;
      const year = parseInt(expiryMatch[3], 10);
      const candidate = new Date(year, month, day);
      if (isNaN(candidate.getTime())) {
        errors.insuranceExpiryDate = 'Invalid date';
      }
    }

    const capacity = parseFloat(addVehicleForm.vehicleCapacity);
    if (!addVehicleForm.vehicleCapacity || isNaN(capacity) || capacity <= 0) {
      errors.vehicleCapacity = 'Valid vehicle capacity is required';
    }

    const amount = parseFloat(addVehicleForm.amount);
    if (!addVehicleForm.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Valid amount is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVehicle = useCallback(async () => {
    const isEditMode = editingVehicle !== null;
    if (!validateVehicleForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const expiryMatch = addVehicleForm.insuranceExpiryDate.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
      if (!expiryMatch) {
        Alert.alert('Error', 'Invalid date format');
        setIsSubmitting(false);
        return;
      }

      const day = parseInt(expiryMatch[1], 10);
      const month = parseInt(expiryMatch[2], 10) - 1;
      const year = parseInt(expiryMatch[3], 10);
      const insuranceExpiryDate = new Date(year, month, day);

      if (!currentUser || currentUser.role !== 'admin') {
        Alert.alert('Error', 'Only admins can add vehicles');
        setIsSubmitting(false);
        return;
      }

      if (!isEditMode) {
        // Check if vehicle number already exists (only for new vehicles)
        const existingVehicle = vehicles.find(v => v.vehicleNumber.toLowerCase() === addVehicleForm.vehicleNumber.trim().toLowerCase());
        if (existingVehicle) {
          Alert.alert('Error', 'A vehicle with this number already exists');
          setIsSubmitting(false);
          return;
        }
        
        await addVehicle({
          agencyId: currentUser.uid,
          vehicleNumber: addVehicleForm.vehicleNumber.trim().toUpperCase(),
          insuranceCompanyName: addVehicleForm.insuranceCompanyName.trim(),
          insuranceExpiryDate: insuranceExpiryDate,
          vehicleCapacity: parseFloat(addVehicleForm.vehicleCapacity),
          amount: parseFloat(addVehicleForm.amount),
        });
        
        Alert.alert('Success', 'Vehicle added successfully');
      } else {
        // Check if vehicle number was changed and if it already exists for another vehicle
        if (addVehicleForm.vehicleNumber.trim().toUpperCase() !== editingVehicle.vehicleNumber.toUpperCase()) {
          const existingVehicle = vehicles.find(v => v.vehicleNumber.toLowerCase() === addVehicleForm.vehicleNumber.trim().toLowerCase() && v.id !== editingVehicle.id);
          if (existingVehicle) {
            Alert.alert('Error', 'A vehicle with this number already exists');
            setIsSubmitting(false);
            return;
          }
        }
        
        await updateVehicle(editingVehicle.id, {
          vehicleNumber: addVehicleForm.vehicleNumber.trim().toUpperCase(),
          insuranceCompanyName: addVehicleForm.insuranceCompanyName.trim(),
          insuranceExpiryDate: insuranceExpiryDate,
          vehicleCapacity: parseFloat(addVehicleForm.vehicleCapacity),
          amount: parseFloat(addVehicleForm.amount),
        });
        
        Alert.alert('Success', 'Vehicle updated successfully');
      }
      
      // Reset form
      setAddVehicleForm({
        vehicleNumber: '',
        insuranceCompanyName: '',
        insuranceExpiryDate: '',
        vehicleCapacity: '',
        amount: '',
      });
      setFormErrors({});
      setEditingVehicle(null);
      setShowAddVehicleModal(false);
    } catch (error) {
      Alert.alert('Error', isEditMode ? 'Failed to update vehicle. Please try again.' : 'Failed to add vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [addVehicleForm, vehicles, addVehicle, updateVehicle, editingVehicle, currentUser]);

  const resetVehicleForm = useCallback(() => {
    setAddVehicleForm({
      vehicleNumber: '',
      insuranceCompanyName: '',
      insuranceExpiryDate: '',
      vehicleCapacity: '',
      amount: '',
    });
    setFormErrors({});
    setEditingVehicle(null);
  }, []);

  const handleEditVehicle = useCallback((vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setAddVehicleForm({
      vehicleNumber: vehicle.vehicleNumber || '',
      insuranceCompanyName: vehicle.insuranceCompanyName || '',
      insuranceExpiryDate: vehicle.insuranceExpiryDate ? (() => {
        const date = new Date(vehicle.insuranceExpiryDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      })() : '',
      vehicleCapacity: vehicle.vehicleCapacity?.toString() || '',
      amount: vehicle.amount?.toString() || '',
    });
    setFormErrors({});
    setShowAddVehicleModal(true);
  }, []);

  const handleDeleteVehicle = useCallback(async () => {
    if (!editingVehicle) return;

    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete vehicle ${editingVehicle.vehicleNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicle(editingVehicle.id);
              Alert.alert('Success', 'Vehicle deleted successfully');
              
              // Close modal and reset form
              setEditingVehicle(null);
              setShowAddVehicleModal(false);
              resetVehicleForm();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vehicle. Please try again.');
            }
          },
        },
      ]
    );
  }, [editingVehicle, deleteVehicle, resetVehicleForm]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setAddVehicleForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);

  const filteredVehicles = vehicles.filter(vehicle => {
    // Show only vehicles for current admin
    const belongsToCurrentAdmin = currentUser && currentUser.role === 'admin' && vehicle.agencyId === currentUser.uid;
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vehicle.insuranceCompanyName.toLowerCase().includes(searchQuery.toLowerCase());
    return belongsToCurrentAdmin && matchesSearch;
  });

  const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
    <Card style={styles.vehicleCard}>
      <TouchableOpacity 
        style={styles.vehicleCardContent}
        onPress={() => {
          if (showVehicleModal) return;
          setSelectedVehicle(vehicle);
          setShowVehicleModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Typography variant="h3" style={styles.vehicleNumber}>
              {vehicle.vehicleNumber}
            </Typography>
            <Typography variant="body" style={styles.vehicleInsurance}>
              {vehicle.insuranceCompanyName}
            </Typography>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditVehicle(vehicle);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color="#34C759" />
          </TouchableOpacity>
        </View>

        <View style={styles.vehicleDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              Insurance Expiry: {new Date(vehicle.insuranceExpiryDate).toLocaleDateString()}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="water-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              Capacity: {vehicle.vehicleCapacity} Liters
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              Amount: ₹{vehicle.amount}
            </Typography>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const VehicleModal: React.FC = () => (
    <Modal
      visible={showVehicleModal}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={() => setShowVehicleModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Typography variant="h2" style={styles.modalTitle}>
            Vehicle Details
          </Typography>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowVehicleModal(false);
            }}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {selectedVehicle && (
          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Vehicle Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Vehicle Number</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedVehicle.vehicleNumber}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Insurance Company</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedVehicle.insuranceCompanyName}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Insurance Expiry Date</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {new Date(selectedVehicle.insuranceExpiryDate).toLocaleDateString()}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Vehicle Capacity</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedVehicle.vehicleCapacity} Liters
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Amount</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  ₹{selectedVehicle.amount}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Created At</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {new Date(selectedVehicle.createdAt).toLocaleDateString()}
                </Typography>
              </View>
            </Card>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (isLoading && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading vehicles...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        scrollEnabled={!showVehicleModal && !showAddVehicleModal}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2" style={styles.title}>
            Vehicle Management
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Manage vehicle details and insurance
          </Typography>
        </View>

        {/* Search */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vehicles..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
          </View>
        </View>

        {/* Vehicles List */}
        <View style={styles.vehiclesSection} pointerEvents={(showVehicleModal || showAddVehicleModal) ? 'none' : 'auto'}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Vehicles ({filteredVehicles.length})
          </Typography>
          
          {filteredVehicles.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyText}>
                {searchQuery 
                  ? 'No vehicles found matching your criteria'
                  : 'No vehicles added yet'
                }
              </Typography>
            </Card>
          ) : (
            filteredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Vehicle Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddVehicleModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <VehicleModal />
      <AddVehicleModal 
        visible={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        formData={addVehicleForm}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        onFormChange={handleFormChange}
        onSubmit={handleAddVehicle}
        onReset={resetVehicleForm}
        onDelete={handleDeleteVehicle}
        isEditMode={editingVehicle !== null}
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
    borderBottomColor: '#E5E5EA',
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
  vehiclesSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  vehicleCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  vehicleCardContent: {
    padding: UI_CONFIG.spacing.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  editButton: {
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#34C759',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  vehicleInsurance: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  vehicleDetails: {
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
    borderBottomColor: '#E5E5EA',
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
    borderBottomColor: '#F2F2F7',
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
    shadowColor: '#000',
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
  addVehicleButton: {
    backgroundColor: UI_CONFIG.colors.primary,
    marginBottom: UI_CONFIG.spacing.md,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.textSecondary,
  },
});

export default VehicleManagementScreen;

