import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import { useVehicleStore } from '../../store/vehicleStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography } from '../../components/common';
import { Address, BookingForm, TankerSize } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils } from '../../utils/pricing';

const { width } = Dimensions.get('window');

type BookingScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Booking'>;

interface BookingScreenProps {
  navigation: BookingScreenNavigationProp;
}

const BookingScreen: React.FC<BookingScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { createBooking, isLoading } = useBookingStore();
  const { fetchUsersByRole, users: allUsers, isLoading: usersLoading } = useUserStore();
  const { fetchVehiclesByAgency } = useVehicleStore();

  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; capacity: number; amount: number; vehicleNumber: string } | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<{ id: string; name: string } | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [dateError, setDateError] = useState<string>('');

  // Load default address when user data is available
  useEffect(() => {
    if (user && user.savedAddresses && user.savedAddresses.length > 0) {
      const defaultAddress = user.savedAddresses.find(addr => addr.isDefault);
      if (defaultAddress && !deliveryAddress) {
        setDeliveryAddress(defaultAddress.street);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch admin users (agencies) with business names
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        await fetchUsersByRole('admin');
      } catch (error) {
        console.error('Failed to load agencies:', error);
      }
    };
    loadAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build tanker agencies list from admin users with business names
  const tankerAgencies: Array<{ id: string; name: string }> = React.useMemo(() => {
    return allUsers
      .filter(user => user.role === 'admin' && (user.businessName || user.name))
      .map(admin => ({
        id: admin.uid,
        name: admin.businessName || admin.name || 'Unnamed Agency'
      }));
  }, [allUsers]);

  // Fetch vehicles when agency is selected
  useEffect(() => {
    const loadVehiclesForAgency = async () => {
      if (selectedAgency) {
        setVehiclesLoading(true);
        try {
          const vehicles = await fetchVehiclesByAgency(selectedAgency.id);
          setAvailableVehicles(vehicles);
          // Reset selected vehicle when agency changes
          setSelectedVehicle(null);
          setPriceBreakdown(null);
        } catch (error) {
          console.error('Failed to load vehicles:', error);
          setAvailableVehicles([]);
        } finally {
          setVehiclesLoading(false);
        }
      } else {
        setAvailableVehicles([]);
        setSelectedVehicle(null);
        setPriceBreakdown(null);
      }
    };
    loadVehiclesForAgency();
  }, [selectedAgency, fetchVehiclesByAgency]);

  useEffect(() => {
    if (selectedVehicle) {
      calculatePrice();
    }
  }, [selectedVehicle]);

  const calculatePrice = () => {
    if (!selectedVehicle) return;

    // Only show base price, no distance-based charges
    const basePrice = selectedVehicle.amount;
    
    setPriceBreakdown({
      tankerSize: `${selectedVehicle.capacity}L Tanker`,
      basePrice: basePrice,
      totalPrice: basePrice,
    });
  };

  const handleVehicleSelection = (vehicle: any) => {
    setSelectedVehicle({
      id: vehicle.id,
      capacity: vehicle.vehicleCapacity,
      amount: vehicle.amount,
      vehicleNumber: vehicle.vehicleNumber
    });
    setShowTankerModal(false);
  };

  const handleAgencySelection = (agency: { id: string; name: string }) => {
    setSelectedAgency(agency);
    setShowAgencyModal(false);
  };

  const handleAddressSelection = (address: Address) => {
    setDeliveryAddress(address.street);
    setShowSavedAddressModal(false);
  };

  // Validate if the date is not in the past
  const validateDate = (dateString: string): { isValid: boolean; error: string } => {
    if (!dateString || dateString.length < 10) {
      return { isValid: false, error: 'Please enter a complete date' };
    }

    try {
      // Parse the date string (DD-MM-YYYY format)
      const dateParts = dateString.split('-');
      if (dateParts.length !== 3) {
        return { isValid: false, error: 'Invalid date format. Use DD-MM-YYYY' };
      }

      const [dayStr, monthStr, yearStr] = dateParts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      // Check if the date components are valid numbers
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return { isValid: false, error: 'Date must contain only numbers' };
      }

      // Validate ranges
      if (year < 2024 || year > 2030) {
        return { isValid: false, error: 'Year must be between 2024 and 2030' };
      }

      if (month < 1 || month > 12) {
        return { isValid: false, error: 'Month must be between 1 and 12' };
      }

      if (day < 1 || day > 31) {
        return { isValid: false, error: 'Day must be between 1 and 31' };
      }

      // Create date object (month is 0-indexed in JavaScript Date)
      const inputDate = new Date(year, month - 1, day);
      
      // Check if the date is valid (handles invalid dates like 32-13-2024)
      if (isNaN(inputDate.getTime())) {
        return { isValid: false, error: 'Invalid date - this date does not exist' };
      }

      if (inputDate.getDate() !== day || inputDate.getMonth() !== month - 1 || inputDate.getFullYear() !== year) {
        return { isValid: false, error: 'Invalid date - please check the date' };
      }

      const today = new Date();
      
      // Reset time to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      // Check if the date is in the past
      if (inputDate < today) {
        return { isValid: false, error: 'Cannot select past dates' };
      }

      // Check if date is too far in the future (more than 30 days)
      const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (inputDate > maxDate) {
        return { isValid: false, error: 'Cannot select dates more than 30 days in future' };
      }

      return { isValid: true, error: '' };
    } catch (error) {
      return { isValid: false, error: 'Invalid date format' };
    }
  };

  // Format date input to automatically add hyphens
  const formatDateInput = (text: string) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Add hyphens at appropriate positions
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4, 8)}`;
    }
  };

  // Format time input to automatically add colon
  const formatTimeInput = (text: string) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Add colon at appropriate position
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    } else {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    }
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDeliveryDate(formatted);
    
    // Validate the date
    const validation = validateDate(formatted);
    setDateError(validation.error);
  };

  const handleTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setDeliveryTime(formatted);
  };

  const handleTimePeriodChange = (period: 'AM' | 'PM') => {
    setTimePeriod(period);
  };

  // Validate time input
  const validateTime = (timeString: string): { isValid: boolean; error: string } => {
    if (!timeString || timeString.length < 5) {
      return { isValid: false, error: 'Please enter a complete time' };
    }

    try {
      // Parse time (HH:MM format)
      const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return { isValid: false, error: 'Invalid time format. Use HH:MM' };
      }

      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);

      // Validate time components
      if (isNaN(hours) || isNaN(minutes)) {
        return { isValid: false, error: 'Time must contain only numbers' };
      }

      if (hours < 1 || hours > 12) {
        return { isValid: false, error: 'Hours must be between 1 and 12' };
      }

      if (minutes < 0 || minutes > 59) {
        return { isValid: false, error: 'Minutes must be between 0 and 59' };
      }

      return { isValid: true, error: '' };
    } catch (error) {
      return { isValid: false, error: 'Invalid time format' };
    }
  };

  // Convert 12-hour format to 24-hour format for date creation
  const createScheduledDate = (dateString: string, timeString: string, period: 'AM' | 'PM'): Date => {
    try {
      // Validate inputs
      if (!dateString || !timeString || !period) {
        throw new Error('Missing required parameters');
      }

      // Parse date (DD-MM-YYYY format)
      const dateParts = dateString.split('-');
      if (dateParts.length !== 3) {
        throw new Error('Invalid date format - expected DD-MM-YYYY');
      }

      const [dayStr, monthStr, yearStr] = dateParts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      // Validate date components
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        throw new Error('Invalid date components - must be numbers');
      }

      if (year < 2024 || year > 2030) {
        throw new Error('Year must be between 2024 and 2030');
      }

      if (month < 1 || month > 12) {
        throw new Error('Month must be between 1 and 12');
      }

      if (day < 1 || day > 31) {
        throw new Error('Day must be between 1 and 31');
      }

      // Parse time (HH:MM format)
      const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        throw new Error('Invalid time format - expected HH:MM');
      }
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      
      // Validate time components
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid time components - must be numbers');
      }

      if (hours < 1 || hours > 12) {
        throw new Error('Hours must be between 1 and 12');
      }

      if (minutes < 0 || minutes > 59) {
        throw new Error('Minutes must be between 0 and 59');
      }
      
      // Convert to 24-hour format
      if (period === 'AM') {
        if (hours === 12) hours = 0;
      } else { // PM
        if (hours !== 12) hours += 12;
      }
      
      // Create date object with additional validation
      const date = new Date(year, month - 1, day, hours, minutes);
      
      // Verify the date is valid (handles cases like Feb 30, etc.)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date - date does not exist');
      }

      // Double-check that the created date matches our input
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        throw new Error('Invalid date - date components do not match');
      }

      return date;
    } catch (error) {
      console.error('Error creating scheduled date:', error);
      // Return a fallback date (tomorrow at 9 AM) instead of current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  };


  const handleBooking = async () => {
    if (!selectedVehicle || !selectedAgency || !deliveryAddress.trim() || !user) {
      Alert.alert('Error', 'Please select agency, vehicle and enter delivery address');
      return;
    }

    if (!deliveryDate.trim() || !deliveryTime.trim()) {
      Alert.alert('Error', 'Please enter both delivery date and time');
      return;
    }

    // Validate the date
    const dateValidation = validateDate(deliveryDate);
    if (!dateValidation.isValid) {
      Alert.alert('Invalid Date', dateValidation.error);
      return;
    }

    // Validate the time
    const timeValidation = validateTime(deliveryTime);
    if (!timeValidation.isValid) {
      Alert.alert('Invalid Time', timeValidation.error);
      return;
    }

    if (!priceBreakdown) {
      Alert.alert('Error', 'Unable to calculate price. Please try again.');
      return;
    }

    try {
      // Create a mock Address object from the simple address string
      const mockAddress: Address = {
        street: deliveryAddress,
        city: 'City',
        state: 'State',
        pincode: '000000',
        latitude: 28.6139 + (Math.random() - 0.5) * 0.1, // Mock coordinates
        longitude: 77.2090 + (Math.random() - 0.5) * 0.1,
      };

      const bookingData = {
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        agencyId: selectedAgency.id,
        agencyName: selectedAgency.name,
        status: 'pending' as const,
        tankerSize: selectedVehicle.capacity,
        basePrice: priceBreakdown.basePrice,
        distanceCharge: 0, // No distance-based charges
        totalPrice: priceBreakdown.totalPrice,
        deliveryAddress: mockAddress,
        distance: 0, // Distance not used for pricing
        scheduledFor: deliveryDate && deliveryTime ? createScheduledDate(deliveryDate, deliveryTime, timePeriod) : undefined,
        isImmediate: false,
        paymentStatus: 'pending' as const,
        canCancel: true,
      };

      await createBooking(bookingData);
      
      Alert.alert(
        'Booking Successful!',
        `Your booking has been placed successfully.\nAgency: ${selectedAgency.name}\nOrder ID: ${bookingData.customerId.slice(-6)}\nTotal Amount: ${PricingUtils.formatPrice(priceBreakdown.totalPrice)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };


  const TankerSelectionModal = () => (
    <Modal visible={showTankerModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTankerModal(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Vehicle</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {vehiclesLoading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>Loading vehicles...</Typography>
            </View>
          ) : availableVehicles.length > 0 ? (
            availableVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                style={[
                  styles.tankerCard,
                  selectedVehicle?.id === vehicle.id && styles.selectedTankerCard,
                ]}
                onPress={() => handleVehicleSelection(vehicle)}
              >
                <View style={styles.tankerInfo}>
                  <Typography variant="body" style={styles.tankerName}>
                    {vehicle.vehicleCapacity}L Tanker - {vehicle.vehicleNumber}
                  </Typography>
                  <Typography variant="caption" style={styles.tankerPrice}>
                    {PricingUtils.formatPrice(vehicle.amount)} base price
                  </Typography>
                </View>
                <Ionicons
                  name={selectedVehicle?.id === vehicle.id ? "radio-button-on" : "radio-button-off"}
                  size={24}
                  color={selectedVehicle?.id === vehicle.id ? "#007AFF" : "#8E8E93"}
                />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyStateText}>No vehicles available</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>
                {selectedAgency ? 'This agency has no vehicles yet' : 'Please select an agency first'}
              </Typography>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const AgencySelectionModal = () => (
    <Modal visible={showAgencyModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAgencyModal(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Tanker Agency</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {usersLoading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>Loading agencies...</Typography>
            </View>
          ) : tankerAgencies.length > 0 ? (
            tankerAgencies.map((agency) => (
              <Card
                key={agency.id}
                style={[
                  styles.tankerCard,
                  selectedAgency?.id === agency.id && styles.selectedTankerCard,
                ]}
                onPress={() => handleAgencySelection(agency)}
              >
                <View style={styles.tankerInfo}>
                  <Typography variant="body" style={styles.tankerName}>{agency.name}</Typography>
                </View>
                <Ionicons
                  name={selectedAgency?.id === agency.id ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={selectedAgency?.id === agency.id ? '#007AFF' : '#8E8E93'}
                />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyStateText}>No agencies available</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>Please contact support if you need assistance</Typography>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const SavedAddressModal = () => (
    <Modal visible={showSavedAddressModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSavedAddressModal(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Saved Address</Typography>
          <TouchableOpacity onPress={() => navigation.navigate('SavedAddresses')}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {user?.savedAddresses && user.savedAddresses.length > 0 ? (
            user.savedAddresses.map((address) => (
              <Card
                key={address.id}
                style={styles.addressCard}
                onPress={() => handleAddressSelection(address)}
              >
                <View style={styles.addressInfo}>
                  <View style={styles.addressTitleRow}>
                    <Typography variant="body" style={styles.addressTitle}>{address.street}</Typography>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Typography variant="caption" style={styles.defaultText}>DEFAULT</Typography>
                      </View>
                    )}
                  </View>
                  {(address.city || address.state || address.pincode) && (
                    <Typography variant="caption" style={styles.addressDetails}>
                      {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {address.landmark && (
                    <Typography variant="caption" style={styles.landmark}>
                      Near {address.landmark}
                    </Typography>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyStateText}>No saved addresses</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>Add your first address to get started</Typography>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('SavedAddresses')}
              >
                <Typography variant="body" style={styles.emptyStateButtonText}>Add Address</Typography>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Creating your booking...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.title}>Book Water Tanker</Typography>
      </View>

      {/* Tanker Size Selection */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Select Tanker Agency</Typography>
        <Card style={styles.selectionCard} onPress={() => setShowAgencyModal(true)}>
          <View style={styles.selectionContent}>
            <View style={styles.selectionInfo}>
              <Typography variant="body" style={styles.selectionLabel}>
                {selectedAgency ? selectedAgency.name : 'Choose tanker agency'}
              </Typography>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </View>
        </Card>
      </View>

      {/* Vehicle Selection */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Select Vehicle</Typography>
        <Card 
          style={[styles.selectionCard, !selectedAgency && styles.selectionCardDisabled]} 
          onPress={() => {
            if (selectedAgency) {
              setShowTankerModal(true);
            } else {
              Alert.alert('Info', 'Please select an agency first');
            }
          }}
        >
          <View style={styles.selectionContent}>
            <View style={styles.selectionInfo}>
              <Typography variant="body" style={styles.selectionLabel}>
                {selectedVehicle 
                  ? `${selectedVehicle.capacity}L Tanker - ${selectedVehicle.vehicleNumber}`
                  : selectedAgency 
                    ? 'Choose vehicle'
                    : 'Select agency first'}
              </Typography>
              {selectedVehicle && (
                <Typography variant="caption" style={styles.selectionSubtext}>
                  Base price: {PricingUtils.formatPrice(selectedVehicle.amount)}
                </Typography>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </View>
        </Card>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Address</Typography>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Enter your delivery address..."
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            numberOfLines={3}
          />
        </Card>
        <TouchableOpacity
          style={styles.savedAddressButton}
          onPress={() => setShowSavedAddressModal(true)}
        >
          <Ionicons name="location-outline" size={20} color="#007AFF" />
          <Typography variant="body" style={styles.savedAddressButtonText}>Select from Saved Addresses</Typography>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Delivery Timing */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Timing</Typography>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeInputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Date</Typography>
              <Card style={[styles.inputCard, dateError && styles.inputCardError]}>
                <TextInput
                  style={styles.dateTimeInput}
                  placeholder="DD-MM-YYYY"
                  value={deliveryDate}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </Card>
              {dateError && (
                <Typography variant="caption" style={styles.errorText}>{dateError}</Typography>
              )}
            </View>
            <View style={styles.dateTimeInputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Time</Typography>
              <Card style={styles.inputCard}>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.dateTimeInput}
                    placeholder="HH:MM"
                    value={deliveryTime}
                    onChangeText={handleTimeChange}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <View style={styles.timePeriodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.timePeriodButton,
                        timePeriod === 'AM' && styles.timePeriodButtonActive
                      ]}
                      onPress={() => handleTimePeriodChange('AM')}
                    >
                      <Typography variant="body" style={[
                        styles.timePeriodText,
                        timePeriod === 'AM' && styles.timePeriodTextActive
                      ]}>AM</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timePeriodButton,
                        timePeriod === 'PM' && styles.timePeriodButtonActive
                      ]}
                      onPress={() => handleTimePeriodChange('PM')}
                    >
                      <Typography variant="body" style={[
                        styles.timePeriodText,
                        timePeriod === 'PM' && styles.timePeriodTextActive
                      ]}>PM</Typography>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </View>
          </View>
        </View>
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Special Instructions (Optional)</Typography>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Any special instructions for delivery..."
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
          />
        </Card>
      </View>

      {/* Price Breakdown */}
      {priceBreakdown && (
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>Price Breakdown</Typography>
          <Card style={styles.priceCard}>
            {selectedAgency && (
              <View style={styles.priceRow}>
                <Typography variant="body" style={styles.priceLabel}>Agency</Typography>
                <Typography variant="body" style={styles.priceValue}>{selectedAgency.name}</Typography>
              </View>
            )}
            <View style={styles.priceRow}>
              <Typography variant="body" style={styles.priceLabel}>Vehicle Capacity</Typography>
              <Typography variant="body" style={styles.priceValue}>{selectedVehicle?.capacity}L</Typography>
            </View>
            {selectedVehicle && (
              <View style={styles.priceRow}>
                <Typography variant="body" style={styles.priceLabel}>Vehicle Number</Typography>
                <Typography variant="body" style={styles.priceValue}>{selectedVehicle.vehicleNumber}</Typography>
              </View>
            )}
            <View style={styles.priceRow}>
              <Typography variant="body" style={styles.priceLabel}>Base Price</Typography>
              <Typography variant="body" style={styles.priceValue}>{PricingUtils.formatPrice(priceBreakdown.basePrice)}</Typography>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Typography variant="h3" style={styles.totalLabel}>Total Amount</Typography>
              <Typography variant="h3" style={styles.totalValue}>{PricingUtils.formatPrice(priceBreakdown.totalPrice)}</Typography>
            </View>
          </Card>
        </View>
      )}

      {/* Book Now Button */}
      <View style={styles.section}>
        <Button
          title="Book Now"
          onPress={handleBooking}
          disabled={!selectedVehicle || !selectedAgency || !deliveryAddress.trim() || !deliveryDate.trim() || !deliveryTime.trim() || !priceBreakdown}
          style={styles.bookButton}
        />
      </View>

      <TankerSelectionModal />
      <AgencySelectionModal />
      <SavedAddressModal />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  selectionCard: {
    marginBottom: 8,
  },
  selectionCardDisabled: {
    opacity: 0.5,
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  selectionSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  dateTimeContainer: {
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  dateTimeInput: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 12,
    flex: 1,
  },
  inputCard: {
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  inputCardError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    fontSize: 16,
    color: '#000000',
    textAlignVertical: 'top',
  },
  priceCard: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bookButton: {
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tankerCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTankerCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  tankerInfo: {
    flex: 1,
  },
  tankerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  tankerPrice: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  timePeriodContainer: {
    flexDirection: 'column',
    gap: 2,
    marginLeft: 12,
  },
  timePeriodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E1E5E9',
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timePeriodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  timePeriodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  savedAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
  },
  savedAddressButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    flex: 1,
    marginLeft: 8,
  },
  addressCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressInfo: {
    flex: 1,
    marginRight: 12,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addressDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  landmark: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BookingScreen;
