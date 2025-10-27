import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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

  const [selectedTankerSize, setSelectedTankerSize] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [dateError, setDateError] = useState<string>('');

  // Tanker sizes configuration
  const tankerSizes: TankerSize[] = [
    { id: '1', size: 10000, basePrice: 600, isActive: true, displayName: '10000L Tanker' },
    { id: '2', size: 15000, basePrice: 900, isActive: true, displayName: '15000L Tanker' },
  ];

  // Default pricing
  const pricing = PricingUtils.getDefaultPricing();

  useEffect(() => {
    if (selectedTankerSize && deliveryAddress.trim()) {
      calculatePrice();
    }
  }, [selectedTankerSize, deliveryAddress]);

  const calculatePrice = () => {
    if (!selectedTankerSize || !deliveryAddress.trim()) return;

    const tanker = tankerSizes.find(t => t.size === selectedTankerSize);
    if (!tanker) return;

    // Mock distance calculation (in real app, use actual distance calculation)
    const distance = Math.random() * 20 + 5; // Random distance between 5-25 km

    const breakdown = PricingUtils.getPriceBreakdown(tanker, distance, pricing);
    setPriceBreakdown({ ...breakdown, distance });
  };

  const handleTankerSelection = (size: number) => {
    setSelectedTankerSize(size);
    setShowTankerModal(false);
  };

  const handleAddressSelection = (address: Address) => {
    setDeliveryAddress(address.street);
    setShowSavedAddressModal(false);
  };

  // Validate if the date is not in the past
  const validateDate = (dateString: string): { isValid: boolean; error: string } => {
    if (!dateString || dateString.length < 10) {
      return { isValid: false, error: '' };
    }

    try {
      // Parse the date string (DD-MM-YYYY format)
      const [day, month, year] = dateString.split('-').map(Number);
      
      // Check if the date components are valid
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return { isValid: false, error: 'Invalid date format' };
      }

      // Create date object (month is 0-indexed in JavaScript Date)
      const inputDate = new Date(year, month - 1, day);
      const today = new Date();
      
      // Reset time to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      // Check if the date is valid (handles invalid dates like 32-13-2024)
      if (inputDate.getDate() !== day || inputDate.getMonth() !== month - 1 || inputDate.getFullYear() !== year) {
        return { isValid: false, error: 'Invalid date' };
      }

      // Check if the date is in the past
      if (inputDate < today) {
        return { isValid: false, error: 'Cannot select past dates' };
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

  // Convert 12-hour format to 24-hour format for date creation
  const createScheduledDate = (dateString: string, timeString: string, period: 'AM' | 'PM'): Date => {
    try {
      // Parse date (DD-MM-YYYY format)
      const [day, month, year] = dateString.split('-').map(Number);
      
      // Parse time (HH:MM format)
      const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        throw new Error('Invalid time format');
      }
      
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      // Convert to 24-hour format
      if (period === 'AM') {
        if (hours === 12) hours = 0;
      } else { // PM
        if (hours !== 12) hours += 12;
      }
      
      // Create date object
      return new Date(year, month - 1, day, hours, minutes);
    } catch (error) {
      console.error('Error creating scheduled date:', error);
      // Fallback to current date/time
      return new Date();
    }
  };


  const handleBooking = async () => {
    if (!selectedTankerSize || !deliveryAddress.trim() || !user) {
      Alert.alert('Error', 'Please select tanker size and enter delivery address');
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
        status: 'pending' as const,
        tankerSize: selectedTankerSize,
        basePrice: priceBreakdown.basePrice,
        distanceCharge: priceBreakdown.distanceCharge,
        totalPrice: priceBreakdown.totalPrice,
        deliveryAddress: mockAddress,
        distance: priceBreakdown.distance,
        scheduledFor: deliveryDate && deliveryTime ? createScheduledDate(deliveryDate, deliveryTime, timePeriod) : undefined,
        isImmediate: false,
        paymentStatus: 'pending' as const,
        canCancel: true,
      };

      await createBooking(bookingData);
      
      Alert.alert(
        'Booking Successful!',
        `Your booking has been placed successfully.\nOrder ID: ${bookingData.customerId.slice(-6)}\nTotal Amount: ${PricingUtils.formatPrice(priceBreakdown.totalPrice)}`,
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
          <Text style={styles.modalTitle}>Select Tanker Size</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {tankerSizes.map((tanker) => (
            <Card
              key={tanker.id}
              style={[
                styles.tankerCard,
                selectedTankerSize === tanker.size && styles.selectedTankerCard,
              ]}
              onPress={() => handleTankerSelection(tanker.size)}
            >
              <View style={styles.tankerInfo}>
                <Text style={styles.tankerName}>{tanker.displayName}</Text>
                <Text style={styles.tankerPrice}>
                  {PricingUtils.formatPrice(tanker.basePrice)} base price
                </Text>
              </View>
              <Ionicons
                name={selectedTankerSize === tanker.size ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={selectedTankerSize === tanker.size ? "#007AFF" : "#8E8E93"}
              />
            </Card>
          ))}
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
          <Text style={styles.modalTitle}>Select Saved Address</Text>
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
                    <Text style={styles.addressTitle}>{address.street}</Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  {(address.city || address.state || address.pincode) && (
                    <Text style={styles.addressDetails}>
                      {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {address.landmark && (
                    <Text style={styles.landmark}>
                      Near {address.landmark}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color="#8E8E93" />
              <Text style={styles.emptyStateText}>No saved addresses</Text>
              <Text style={styles.emptyStateSubtext}>Add your first address to get started</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('SavedAddresses')}
              >
                <Text style={styles.emptyStateButtonText}>Add Address</Text>
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
          <Text style={styles.loadingText}>Creating your booking...</Text>
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
        <Text style={styles.title}>Book Water Tanker</Text>
      </View>

      {/* Tanker Size Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Tanker Size</Text>
        <Card style={styles.selectionCard} onPress={() => setShowTankerModal(true)}>
          <View style={styles.selectionContent}>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionLabel}>
                {selectedTankerSize ? `${selectedTankerSize}L Tanker` : 'Choose tanker size'}
              </Text>
              {selectedTankerSize && (
                <Text style={styles.selectionSubtext}>
                  Base price: {PricingUtils.formatPrice(tankerSizes.find(t => t.size === selectedTankerSize)?.basePrice || 0)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </View>
        </Card>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
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
          <Text style={styles.savedAddressButtonText}>Select from Saved Addresses</Text>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Delivery Timing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Timing</Text>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeInputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
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
                <Text style={styles.errorText}>{dateError}</Text>
              )}
            </View>
            <View style={styles.dateTimeInputContainer}>
              <Text style={styles.inputLabel}>Time</Text>
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
                      <Text style={[
                        styles.timePeriodText,
                        timePeriod === 'AM' && styles.timePeriodTextActive
                      ]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timePeriodButton,
                        timePeriod === 'PM' && styles.timePeriodButtonActive
                      ]}
                      onPress={() => handleTimePeriodChange('PM')}
                    >
                      <Text style={[
                        styles.timePeriodText,
                        timePeriod === 'PM' && styles.timePeriodTextActive
                      ]}>PM</Text>
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
        <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
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
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <Card style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tanker Size</Text>
              <Text style={styles.priceValue}>{priceBreakdown.tankerSize}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Price</Text>
              <Text style={styles.priceValue}>{PricingUtils.formatPrice(priceBreakdown.basePrice)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Distance ({priceBreakdown.distance.toFixed(1)} km)</Text>
              <Text style={styles.priceValue}>{PricingUtils.formatPrice(priceBreakdown.distanceCharge)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{PricingUtils.formatPrice(priceBreakdown.totalPrice)}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* Book Now Button */}
      <View style={styles.section}>
        <Button
          title="Book Now"
          onPress={handleBooking}
          disabled={!selectedTankerSize || !deliveryAddress.trim() || !deliveryDate.trim() || !deliveryTime.trim() || !priceBreakdown}
          style={styles.bookButton}
        />
      </View>

      <TankerSelectionModal />
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
