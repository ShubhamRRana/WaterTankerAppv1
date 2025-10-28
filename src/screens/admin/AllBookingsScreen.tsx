import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, Card, Button, LoadingSpinner } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { UI_CONFIG } from '../../constants/config';

const AllBookingsScreen: React.FC = () => {
  const { bookings, fetchAllBookings, updateBookingStatus, isLoading } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      await fetchAllBookings();
    } catch (error) {
      console.error('Failed to load bookings:', error);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(query) ||
        booking.deliveryAddress.city.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
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

  const handleStatusUpdate = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setShowStatusModal(false);
      setSelectedBooking(null);
      Alert.alert('Success', 'Booking status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update booking status. Please try again.');
    }
  };

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const BookingCard: React.FC<{ booking: Booking }> = ({ booking }) => (
    <Card style={styles.bookingCard}>
      <TouchableOpacity 
        onPress={() => openBookingDetails(booking)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Typography variant="h3" style={styles.customerName}>
              {booking.customerName}
            </Typography>
            <Typography variant="caption" style={styles.bookingId}>
              #{booking.id.slice(-8)}
            </Typography>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Ionicons 
              name={getStatusIcon(booking.status) as any} 
              size={16} 
              color="#FFFFFF" 
            />
            <Typography variant="caption" style={styles.statusText}>
              {booking.status.replace('_', ' ').toUpperCase()}
            </Typography>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="water-outline" size={16} color="#8E8E93" />
            <Typography variant="body" style={styles.detailText}>
              {booking.tankerSize}L Tanker
            </Typography>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#8E8E93" />
            <Typography variant="body" style={styles.detailText}>
              {booking.deliveryAddress.city}, {booking.deliveryAddress.state}
            </Typography>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#8E8E93" />
            <Typography variant="body" style={styles.detailText}>
              ₹{booking.totalPrice}
            </Typography>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Typography variant="body" style={styles.detailText}>
              {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </View>
        </View>

        {booking.driverName && (
          <View style={styles.driverInfo}>
            <Typography variant="caption" style={styles.driverLabel}>
              Driver: {booking.driverName}
            </Typography>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  const StatusFilterButton: React.FC<{ filter: { key: string; label: string; icon: string; count: number } }> = ({ filter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === filter.key && styles.filterButtonActive
      ]}
      onPress={() => setStatusFilter(filter.key as BookingStatus | 'all')}
    >
      <Ionicons 
        name={filter.icon as any} 
        size={16} 
        color={statusFilter === filter.key ? '#FFFFFF' : '#007AFF'} 
      />
      <Typography 
        variant="caption" 
        style={[
          styles.filterButtonText,
          statusFilter === filter.key && styles.filterButtonTextActive
        ]}
      >
        {filter.label}
      </Typography>
      <View style={[
        styles.countBadge,
        statusFilter === filter.key && styles.countBadgeActive
      ]}>
        <Typography variant="caption" style={[
          styles.countText,
          statusFilter === filter.key && styles.countTextActive
        ]}>
          {filter.count}
        </Typography>
      </View>
    </TouchableOpacity>
  );

  const BookingDetailsModal: React.FC = () => (
    <Modal
      visible={showBookingModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Typography variant="h2" style={styles.modalTitle}>
            Booking Details
          </Typography>
          <TouchableOpacity
            onPress={() => setShowBookingModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {selectedBooking && (
          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Customer Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Name:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedBooking.customerName}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Phone:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedBooking.customerPhone}
                </Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Booking Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Booking ID:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  #{selectedBooking.id.slice(-8)}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Tanker Size:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedBooking.tankerSize}L
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Status:</Typography>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                  <Typography variant="caption" style={styles.statusText}>
                    {selectedBooking.status.replace('_', ' ').toUpperCase()}
                  </Typography>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Total Price:</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  ₹{selectedBooking.totalPrice}
                </Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Delivery Address
              </Typography>
              <Typography variant="body" style={styles.addressText}>
                {selectedBooking.deliveryAddress.street}
              </Typography>
              <Typography variant="body" style={styles.addressText}>
                {selectedBooking.deliveryAddress.city}, {selectedBooking.deliveryAddress.state}
              </Typography>
              <Typography variant="body" style={styles.addressText}>
                {selectedBooking.deliveryAddress.pincode}
              </Typography>
              {selectedBooking.deliveryAddress.landmark && (
                <Typography variant="caption" style={styles.landmarkText}>
                  Landmark: {selectedBooking.deliveryAddress.landmark}
                </Typography>
              )}
            </Card>

            {selectedBooking.driverName && (
              <Card style={styles.detailCard}>
                <Typography variant="h3" style={styles.detailSectionTitle}>
                  Driver Information
                </Typography>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Name:</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {selectedBooking.driverName}
                  </Typography>
                </View>
                <View style={styles.detailItem}>
                  <Typography variant="body" style={styles.detailLabel}>Phone:</Typography>
                  <Typography variant="body" style={styles.detailValue}>
                    {selectedBooking.driverPhone}
                  </Typography>
                </View>
              </Card>
            )}

            <View style={styles.modalActions}>
              <Button
                title="Update Status"
                onPress={() => {
                  setShowBookingModal(false);
                  setShowStatusModal(true);
                }}
                style={styles.updateButton}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const StatusUpdateModal: React.FC = () => (
    <Modal
      visible={showStatusModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Typography variant="h2" style={styles.modalTitle}>
            Update Status
          </Typography>
          <TouchableOpacity
            onPress={() => setShowStatusModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusOptions}>
          {(['pending', 'accepted', 'in_transit', 'delivered', 'cancelled'] as BookingStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={styles.statusOption}
              onPress={() => selectedBooking && handleStatusUpdate(selectedBooking.id, status)}
            >
              <View style={[styles.statusIcon, { backgroundColor: getStatusColor(status) }]}>
                <Ionicons name={getStatusIcon(status) as any} size={20} color="#FFFFFF" />
              </View>
              <Typography variant="body" style={styles.statusOptionText}>
                {status.replace('_', ' ').toUpperCase()}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h2" style={styles.title}>
          All Bookings
        </Typography>
        <Typography variant="body" style={styles.subtitle}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </Typography>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterButtons.map((filter) => (
            <StatusFilterButton key={filter.key} filter={filter} />
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.bookingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#8E8E93" />
            <Typography variant="h3" style={styles.emptyTitle}>
              {searchQuery || statusFilter !== 'all' ? 'No matching bookings' : 'No bookings yet'}
            </Typography>
            <Typography variant="body" style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter' 
                : 'Bookings will appear here once customers start placing orders'
              }
            </Typography>
          </View>
        }
      />

      <BookingDetailsModal />
      <StatusUpdateModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
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
  searchContainer: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.sm,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  filterSection: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    minHeight: 60,
  },
  filterContainer: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: UI_CONFIG.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: UI_CONFIG.colors.primary,
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
  bookingsList: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  bookingCard: {
    marginBottom: UI_CONFIG.spacing.md,
    padding: UI_CONFIG.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  bookingDetails: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  driverInfo: {
    paddingTop: UI_CONFIG.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  driverLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginTop: UI_CONFIG.spacing.md,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
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
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  detailCard: {
    marginVertical: UI_CONFIG.spacing.sm,
    padding: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    fontWeight: '400',
  },
  addressText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.xs,
  },
  landmarkText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: UI_CONFIG.spacing.xs,
  },
  modalActions: {
    paddingVertical: UI_CONFIG.spacing.lg,
  },
  updateButton: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  statusOptions: {
    padding: UI_CONFIG.spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.md,
    paddingHorizontal: UI_CONFIG.spacing.md,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.spacing.md,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
});

export default AllBookingsScreen;
