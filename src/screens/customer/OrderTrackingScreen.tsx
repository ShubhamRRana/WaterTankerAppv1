import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useBookingStore } from '../../store/bookingStore';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Booking, BookingStatus } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils } from '../../utils/pricing';

const { width } = Dimensions.get('window');

type OrderTrackingScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'OrderTracking'>;
type OrderTrackingScreenRouteProp = RouteProp<CustomerStackParamList, 'OrderTracking'>;

interface OrderTrackingScreenProps {
  navigation: OrderTrackingScreenNavigationProp;
  route: OrderTrackingScreenRouteProp;
}

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { getBookingById, isLoading } = useBookingStore();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<BookingStatus>('pending');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    loadBooking();
    // Simulate real-time updates
    const interval = setInterval(() => {
      simulateTrackingUpdate();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [orderId]);

  const loadBooking = async () => {
    try {
      const bookingData = await getBookingById(orderId);
      if (bookingData) {
        setBooking(bookingData);
        setTrackingStatus(bookingData.status);
        
        // Calculate estimated delivery time
        if (bookingData.distance) {
          const estimatedTime = PricingUtils.calculateDeliveryTime(bookingData.distance);
          setEstimatedDeliveryTime(estimatedTime);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
    }
  };

  const simulateTrackingUpdate = () => {
    if (!booking) return;

    // Simulate status progression
    const statusOrder: BookingStatus[] = ['pending', 'accepted', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(trackingStatus);
    
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      setTrackingStatus(nextStatus);
      
      // Simulate driver location updates
      if (nextStatus === 'in_transit') {
        setDriverLocation({
          latitude: booking.deliveryAddress.latitude + (Math.random() - 0.5) * 0.01,
          longitude: booking.deliveryAddress.longitude + (Math.random() - 0.5) * 0.01,
        });
      }
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'accepted': return '#007AFF';
      case 'in_transit': return '#5856D6';
      case 'delivered': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'Order Placed';
      case 'accepted': return 'Driver Assigned';
      case 'in_transit': return 'On the Way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusDescription = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'Your order has been placed and we\'re looking for a driver';
      case 'accepted': return 'A driver has been assigned and will arrive soon';
      case 'in_transit': return 'Your water tanker is on the way to your location';
      case 'delivered': return 'Your water tanker has been delivered successfully';
      case 'cancelled': return 'This order has been cancelled';
      default: return 'Status unknown';
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'in_transit': return 'car-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleCallDriver = () => {
    if (booking?.driverPhone) {
      Alert.alert(
        'Call Driver',
        `Call ${booking.driverName} at ${booking.driverPhone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // In a real app, you would use Linking to make a phone call
            Alert.alert('Calling...', `Calling ${booking.driverPhone}`);
          }},
        ]
      );
    }
  };

  const handleCancelOrder = () => {
    if (!booking?.canCancel) {
      Alert.alert('Cannot Cancel', 'This order cannot be cancelled as it has already been accepted by a driver.');
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Order Cancelled', 'Your order has been cancelled successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Order Status */}
      <View style={styles.statusSection}>
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(trackingStatus) }]}>
              <Ionicons name={getStatusIcon(trackingStatus)} size={32} color="#FFFFFF" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{getStatusText(trackingStatus)}</Text>
              <Text style={styles.statusDescription}>{getStatusDescription(trackingStatus)}</Text>
            </View>
          </View>
          
          {estimatedDeliveryTime && trackingStatus === 'in_transit' && (
            <View style={styles.estimatedTime}>
              <Ionicons name="time-outline" size={16} color="#007AFF" />
              <Text style={styles.estimatedTimeText}>
                Estimated delivery: {formatTime(estimatedDeliveryTime)}
              </Text>
            </View>
          )}
        </Card>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>#{booking.id.slice(-6)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tanker Size</Text>
            <Text style={styles.detailValue}>{booking.tankerSize}L</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>{PricingUtils.formatPrice(booking.totalPrice)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.createdAt)}</Text>
          </View>
          {booking.scheduledFor && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scheduled For</Text>
              <Text style={styles.detailValue}>{formatDate(booking.scheduledFor)}</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Card style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={20} color="#34C759" />
            <Text style={styles.addressTitle}>Delivery Location</Text>
          </View>
          <Text style={styles.addressText}>{booking.deliveryAddress.street}</Text>
          <Text style={styles.addressText}>
            {booking.deliveryAddress.city}, {booking.deliveryAddress.state} - {booking.deliveryAddress.pincode}
          </Text>
          {booking.deliveryAddress.landmark && (
            <Text style={styles.landmarkText}>Near {booking.deliveryAddress.landmark}</Text>
          )}
        </Card>
      </View>

      {/* Driver Information */}
      {booking.driverName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Information</Text>
          <Card style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color="#5856D6" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{booking.driverName}</Text>
                <Text style={styles.driverPhone}>{booking.driverPhone}</Text>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color="#34C759" />
              </TouchableOpacity>
            </View>
            
            {driverLocation && (
              <View style={styles.locationInfo}>
                <Ionicons name="navigate" size={16} color="#007AFF" />
                <Text style={styles.locationText}>Driver is on the way</Text>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Price Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base Price</Text>
            <Text style={styles.priceValue}>{PricingUtils.formatPrice(booking.basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Distance Charge ({booking.distance.toFixed(1)} km)</Text>
            <Text style={styles.priceValue}>{PricingUtils.formatPrice(booking.distanceCharge)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{PricingUtils.formatPrice(booking.totalPrice)}</Text>
          </View>
        </Card>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <View style={styles.actionsContainer}>
          {booking.canCancel && trackingStatus === 'pending' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
              <Ionicons name="close-outline" size={20} color="#FF3B30" />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
          
          {trackingStatus === 'delivered' && (
            <TouchableOpacity style={styles.rateButton}>
              <Ionicons name="star-outline" size={20} color="#FF9500" />
              <Text style={styles.rateButtonText}>Rate Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    justifyContent: 'space-between',
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
  statusSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusCard: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 16,
    color: '#8E8E93',
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  estimatedTimeText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
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
  detailsCard: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  addressCard: {
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  driverCard: {
    padding: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  callButton: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  locationText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  priceCard: {
    padding: 16,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
  },
});

export default OrderTrackingScreen;