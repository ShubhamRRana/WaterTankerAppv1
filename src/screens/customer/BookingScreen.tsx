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
import { Typography, SuccessNotification } from '../../components/common';
import TankerSelectionModal from '../../components/customer/TankerSelectionModal';
import AgencySelectionModal from '../../components/customer/AgencySelectionModal';
import SavedAddressModal from '../../components/customer/SavedAddressModal';
import DateTimeInput from '../../components/customer/DateTimeInput';
import PriceBreakdown from '../../components/customer/PriceBreakdown';
import { Address, BookingForm, TankerSize, isAdminUser, isCustomerUser } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils, ValidationUtils, SanitizationUtils } from '../../utils';
import { UI_CONFIG } from '../../constants/config';

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
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successNotificationData, setSuccessNotificationData] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Load default address when user data is available
  useEffect(() => {
    if (user && isCustomerUser(user) && user.savedAddresses && user.savedAddresses.length > 0) {
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
              }
    };
    loadAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build tanker agencies list from admin users with business names
  const tankerAgencies: Array<{ id: string; name: string }> = React.useMemo(() => {
    return allUsers
      .filter(isAdminUser)
      .filter(admin => admin.businessName || admin.name)
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
    if (selectedVehicle && selectedVehicle.amount !== undefined) {
      calculatePrice();
    } else if (!selectedVehicle) {
      setPriceBreakdown(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle]);

  const calculatePrice = () => {
    if (!selectedVehicle) return;
    
    // Only show base price, no distance-based charges
    const basePrice = selectedVehicle.amount || 0;
    const totalPrice = basePrice;
    
    setPriceBreakdown({
      tankerSize: `${selectedVehicle.capacity || 0}L Tanker`,
      basePrice: basePrice,
      totalPrice: totalPrice,
    });
  };

  const handleVehicleSelection = (vehicle: any) => {
    setSelectedVehicle({
      id: vehicle.id,
      capacity: vehicle.capacity != null ? vehicle.capacity : 0,
      amount: vehicle.amount,
      vehicleNumber: vehicle.vehicleNumber || ''
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

  // Validate date using ValidationUtils
  const validateDate = (dateString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeDateString(dateString);
    const validation = ValidationUtils.validateDateString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || ''
    };
  };

  // Format date input to automatically add hyphens
  const formatDateInput = (text: string) => {
    // Sanitize first
    const sanitized = SanitizationUtils.sanitizeDateString(text);
    // Remove all non-numeric characters
    const numbers = sanitized.replace(/\D/g, '');
    
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
    // Sanitize first
    const sanitized = SanitizationUtils.sanitizeTimeString(text);
    // Remove all non-numeric characters
    const numbers = sanitized.replace(/\D/g, '');
    
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
    setDateError(validation.isValid ? '' : validation.error);
  };

  const handleTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setDeliveryTime(formatted);
  };

  const handleTimePeriodChange = (period: 'AM' | 'PM') => {
    setTimePeriod(period);
  };

  // Validate time input using ValidationUtils
  const validateTime = (timeString: string): { isValid: boolean; error: string } => {
    const sanitized = SanitizationUtils.sanitizeTimeString(timeString);
    const validation = ValidationUtils.validateTimeString(sanitized);
    return {
      isValid: validation.isValid,
      error: validation.error || ''
    };
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
            // Return a fallback date (tomorrow at 9 AM) instead of current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  };


  const handleBooking = async () => {
    if (!selectedVehicle || !selectedAgency || !user) {
      Alert.alert('Error', 'Please select agency and vehicle');
      return;
    }

    // Sanitize and validate address
    const sanitizedAddress = SanitizationUtils.sanitizeAddress(deliveryAddress.trim());
    const addressValidation = ValidationUtils.validateAddressText(sanitizedAddress);
    if (!addressValidation.isValid) {
      Alert.alert('Invalid Address', addressValidation.error || 'Please enter a valid delivery address');
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
      // Create a mock Address object from the sanitized address string
      const mockAddress: Address = {
        street: sanitizedAddress,
        city: 'City',
        state: 'State',
        pincode: '000000',
        latitude: 28.6139 + (Math.random() - 0.5) * 0.1, // Mock coordinates
        longitude: 77.2090 + (Math.random() - 0.5) * 0.1,
      };

      const bookingData = {
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone || '', // Phone is optional, use empty string as fallback
        agencyId: selectedAgency.id,
        agencyName: selectedAgency.name,
        status: 'pending' as const,
        tankerSize: selectedVehicle.capacity,
        quantity: 1,
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
      
      // Set success notification data
      setSuccessNotificationData({
        title: 'Booking Successful!',
        message: `Your booking has been placed successfully.\nAgency: ${selectedAgency.name}\nOrder ID: ${bookingData.customerId.slice(-6)}\nTotal Amount: ${PricingUtils.formatPrice(priceBreakdown.totalPrice)}`,
      });
      setShowSuccessNotification(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };



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
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.colors.text} />
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
            <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
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
                  ? `${selectedVehicle.capacity != null ? selectedVehicle.capacity : 'N/A'}L Tanker - ${selectedVehicle.vehicleNumber || 'N/A'}`
                  : selectedAgency 
                    ? 'Choose vehicle'
                    : 'Select agency first'}
              </Typography>
              {selectedVehicle && (
                <Typography variant="caption" style={styles.selectionSubtext}>
                  Base price: {PricingUtils.formatPrice(selectedVehicle.amount)} per tanker
                </Typography>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={UI_CONFIG.colors.textSecondary} />
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
            onChangeText={(text) => {
              setDeliveryAddress(text);
            }}
            multiline
            numberOfLines={3}
          />
        </Card>
        <TouchableOpacity
          style={styles.savedAddressButton}
          onPress={() => setShowSavedAddressModal(true)}
        >
          <Ionicons name="location-outline" size={20} color={UI_CONFIG.colors.primary} />
          <Typography variant="body" style={styles.savedAddressButtonText}>Select from Saved Addresses</Typography>
              <Ionicons name="chevron-forward" size={16} color={UI_CONFIG.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Delivery Timing */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Delivery Timing</Typography>
        <DateTimeInput
          date={deliveryDate}
          time={deliveryTime}
          timePeriod={timePeriod}
          dateError={dateError}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onTimePeriodChange={handleTimePeriodChange}
        />
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Special Instructions (Optional)</Typography>
        <Card style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Any special instructions for delivery..."
            value={specialInstructions}
            onChangeText={(text) => {
              const sanitized = SanitizationUtils.sanitizeText(text, 500);
              setSpecialInstructions(sanitized);
            }}
            multiline
            numberOfLines={3}
          />
        </Card>
      </View>

      {/* Price Breakdown */}
      {priceBreakdown && (
        <PriceBreakdown
          agencyName={selectedAgency?.name}
          vehicleCapacity={selectedVehicle?.capacity}
          vehicleNumber={selectedVehicle?.vehicleNumber}
          basePrice={priceBreakdown.basePrice}
          totalPrice={priceBreakdown.totalPrice}
        />
      )}

      {/* Book Now Button */}
      <View style={styles.section}>
        <Button
          title="Book Now"
          onPress={handleBooking}
          disabled={
            !selectedVehicle || 
            !selectedAgency || 
            !deliveryAddress.trim() || 
            !deliveryDate.trim() || 
            !deliveryTime.trim() || 
            !priceBreakdown || 
            !!(dateError && dateError.length > 0)
          }
          style={styles.bookButton}
        />
      </View>

      <TankerSelectionModal
        visible={showTankerModal}
        onClose={() => setShowTankerModal(false)}
        vehicles={availableVehicles}
        selectedVehicleId={selectedVehicle?.id || null}
        onSelectVehicle={handleVehicleSelection}
        loading={vehiclesLoading}
        selectedAgency={selectedAgency}
      />
      <AgencySelectionModal
        visible={showAgencyModal}
        onClose={() => setShowAgencyModal(false)}
        agencies={tankerAgencies}
        selectedAgencyId={selectedAgency?.id || null}
        onSelectAgency={handleAgencySelection}
        loading={usersLoading}
      />
      <SavedAddressModal
        visible={showSavedAddressModal}
        onClose={() => setShowSavedAddressModal(false)}
        addresses={user && isCustomerUser(user) ? (user.savedAddresses || []) : []}
        onSelectAddress={handleAddressSelection}
        navigation={navigation}
      />
      {successNotificationData && (
        <SuccessNotification
          visible={showSuccessNotification}
          title={successNotificationData.title}
          message={successNotificationData.message}
          primaryButtonText="OK"
          onPrimaryPress={() => {
            setShowSuccessNotification(false);
            navigation.goBack();
          }}
          onClose={() => {
            setShowSuccessNotification(false);
            navigation.goBack();
          }}
        />
      )}
      </ScrollView>
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
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  selectionSubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  inputCard: {
    marginBottom: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  textArea: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    textAlignVertical: 'top',
  },
  bookButton: {
    marginTop: 8,
  },
  savedAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    marginTop: 8,
  },
  savedAddressButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
    flex: 1,
    marginLeft: 8,
  },
});

export default BookingScreen;