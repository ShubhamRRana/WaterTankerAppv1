import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Booking, BookingStatus } from '../../types';
import { CustomerTabParamList } from '../../navigation/CustomerNavigator';
import { PricingUtils } from '../../utils/pricing';

type OrderHistoryScreenNavigationProp = BottomTabNavigationProp<CustomerTabParamList, 'Orders'>;

interface OrderHistoryScreenProps {
  navigation: OrderHistoryScreenNavigationProp;
}

const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { bookings, isLoading, fetchCustomerBookings, cancelBooking } = useBookingStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<BookingStatus | 'all'>('all');
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadBookings();
    }
  }, [user?.uid]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, selectedFilter]);

  const loadBookings = async () => {
    if (!user?.uid) return;
    try {
      await fetchCustomerBookings(user.uid);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(query) ||
        booking.deliveryAddress.street.toLowerCase().includes(query) ||
        booking.deliveryAddress.city.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedFilter);
    }

    setFilteredBookings(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBookings();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate counts for each filter
  const getFilterCounts = () => {
    const counts = {
      all: bookings.length,
      pending: bookings.filter(booking => booking.status === 'pending').length,
      accepted: bookings.filter(booking => booking.status === 'accepted').length,
      in_transit: bookings.filter(booking => booking.status === 'in_transit').length,
      delivered: bookings.filter(booking => booking.status === 'delivered').length,
      cancelled: bookings.filter(booking => booking.status === 'cancelled').length,
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  const filterButtons = [
    { key: 'all', label: 'All', icon: 'list-outline', count: filterCounts.all },
    { key: 'pending', label: 'Pending', icon: 'time-outline', count: filterCounts.pending },
    { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', count: filterCounts.accepted },
    { key: 'in_transit', label: 'In Transit', icon: 'car-outline', count: filterCounts.in_transit },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline', count: filterCounts.delivered },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', count: filterCounts.cancelled },
  ];

  const handleCancelBooking = (booking: Booking) => {
    if (!booking.canCancel) {
      Alert.alert('Cannot Cancel', 'This booking cannot be cancelled as it has already been accepted by a driver.');
      return;
    }

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel order #${booking.id.slice(-6)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(booking.id, 'Cancelled by customer');
              Alert.alert('Success', 'Booking cancelled successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
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
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
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


  if (isLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <Text style={styles.subtitle}>{bookings.length} total orders</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterButtons.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter.key as BookingStatus | 'all')}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={16} 
                color={selectedFilter === filter.key ? '#FFFFFF' : '#007AFF'} 
              />
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.countBadge,
                selectedFilter === filter.key && styles.countBadgeActive
              ]}>
                <Text style={[
                  styles.countText,
                  selectedFilter === filter.key && styles.countTextActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      {/* Orders List */}
      <ScrollView
        style={styles.ordersContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter' 
                : 'Book your first tanker to get started'
              }
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{booking.id.slice(-6)}</Text>
                  <Text style={styles.orderDate}>{formatDate(booking.scheduledFor || booking.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Ionicons 
                    name={getStatusIcon(booking.status)} 
                    size={16} 
                    color="#FFFFFF" 
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="water" size={16} color="#007AFF" />
                  <Text style={styles.detailText}>{booking.tankerSize}L Tanker</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#34C759" />
                  <Text style={styles.detailText}>
                    {booking.deliveryAddress.street}, {booking.deliveryAddress.city}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#FF9500" />
                  <Text style={styles.detailText}>{PricingUtils.formatPrice(booking.totalPrice)}</Text>
                </View>
              </View>

              {booking.driverName && (
                <View style={styles.driverInfo}>
                  <Ionicons name="person" size={16} color="#5856D6" />
                  <Text style={styles.driverText}>Driver: {booking.driverName}</Text>
                  <Text style={styles.driverPhone}>{booking.driverPhone}</Text>
                </View>
              )}

              <View style={styles.orderActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // Navigate to order tracking
                    // navigation.navigate('OrderTracking', { orderId: booking.id });
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color="#007AFF" />
                  <Text style={styles.actionText}>Track</Text>
                </TouchableOpacity>

                {booking.canCancel && booking.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelBooking(booking)}
                  >
                    <Ionicons name="close-outline" size={16} color="#FF3B30" />
                    <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
                  </TouchableOpacity>
                )}

                {booking.status === 'delivered' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      Alert.alert('Rate Order', 'Rate your delivery experience');
                    }}
                  >
                    <Ionicons name="star-outline" size={16} color="#FF9500" />
                    <Text style={styles.actionText}>Rate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    minHeight: 60,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
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
  },
  orderCard: {
    marginBottom: 16,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  driverText: {
    fontSize: 14,
    color: '#5856D6',
    marginLeft: 8,
    fontWeight: '500',
  },
  driverPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  cancelText: {
    color: '#FF3B30',
  },
});

export default OrderHistoryScreen;
