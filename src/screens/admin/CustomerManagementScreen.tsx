import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, Card, Button, LoadingSpinner } from '../../components/common';
import { User, Booking } from '../../types';
import { UI_CONFIG } from '../../constants/config';

const CustomerManagementScreen: React.FC = () => {
  const { users, fetchAllUsers, isLoading: usersLoading } = useUserStore();
  const { bookings, fetchAllBookings, isLoading: bookingsLoading } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const customers = users.filter(user => user.role === 'customer');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      await Promise.all([
        fetchAllUsers(),
        fetchAllBookings(),
      ]);
    } catch (error) {
      console.error('Failed to load customers:', error);
      Alert.alert('Error', 'Failed to load customers. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const getCustomerBookings = (customerId: string): Booking[] => {
    return bookings.filter(booking => booking.customerId === customerId);
  };

  const getCustomerStats = (customerId: string) => {
    const customerBookings = getCustomerBookings(customerId);
    const totalBookings = customerBookings.length;
    const completedBookings = customerBookings.filter(b => b.status === 'delivered').length;
    const totalSpent = customerBookings
      .filter(b => b.status === 'delivered')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    return {
      totalBookings,
      completedBookings,
      totalSpent,
      averageOrderValue: completedBookings > 0 ? totalSpent / completedBookings : 0,
    };
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.phone.includes(searchQuery) ||
                         customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const customerBookings = getCustomerBookings(customer.uid);
    const hasRecentActivity = customerBookings.some(booking => {
      const bookingDate = new Date(booking.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return bookingDate > thirtyDaysAgo;
    });
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && hasRecentActivity) ||
                         (filterStatus === 'inactive' && !hasRecentActivity);
    
    return matchesSearch && matchesFilter;
  });

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const CustomerCard: React.FC<{ customer: User }> = ({ customer }) => {
    const customerBookings = getCustomerBookings(customer.uid);
    const stats = getCustomerStats(customer.uid);
    const hasRecentActivity = customerBookings.some(booking => {
      const bookingDate = new Date(booking.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return bookingDate > thirtyDaysAgo;
    });

    return (
      <Card style={styles.customerCard}>
        <TouchableOpacity 
          style={styles.customerCardContent}
          onPress={() => {
            setSelectedCustomer(customer);
            setShowCustomerModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.customerHeader}>
            <View style={styles.customerInfo}>
              <Typography variant="h3" style={styles.customerName}>
                {customer.name}
              </Typography>
              <Typography variant="body" style={styles.customerPhone}>
                {customer.phone}
              </Typography>
              {customer.email && (
                <Typography variant="caption" style={styles.customerEmail}>
                  {customer.email}
                </Typography>
              )}
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: hasRecentActivity ? '#34C759' : '#8E8E93' 
            }]}>
              <Typography variant="caption" style={styles.statusText}>
                {hasRecentActivity ? 'Active' : 'Inactive'}
              </Typography>
            </View>
          </View>

          <View style={styles.customerDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="receipt-outline" size={16} color="#8E8E93" />
              <Typography variant="caption" style={styles.detailText}>
                {stats.totalBookings} total orders
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#8E8E93" />
              <Typography variant="caption" style={styles.detailText}>
                {stats.completedBookings} completed
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color="#8E8E93" />
              <Typography variant="caption" style={styles.detailText}>
                ₹{stats.totalSpent.toFixed(0)} spent
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#8E8E93" />
              <Typography variant="caption" style={styles.detailText}>
                {customer.savedAddresses?.length || 0} saved addresses
              </Typography>
            </View>
          </View>

          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCallCustomer(customer.phone)}
            >
              <Ionicons name="call-outline" size={16} color="#007AFF" />
              <Typography variant="caption" style={styles.actionButtonText}>
                Call
              </Typography>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const CustomerModal: React.FC = () => {
    if (!selectedCustomer) return null;
    
    const customerBookings = getCustomerBookings(selectedCustomer.uid);
    const stats = getCustomerStats(selectedCustomer.uid);

    return (
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Typography variant="h2" style={styles.modalTitle}>
              Customer Details
            </Typography>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Personal Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Name</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedCustomer.name}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Phone</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedCustomer.phone}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Email</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedCustomer.email || 'Not provided'}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Joined</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Order Statistics
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Total Orders</Typography>
                <Typography variant="body" style={styles.detailValue}>{stats.totalBookings}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Completed Orders</Typography>
                <Typography variant="body" style={styles.detailValue}>{stats.completedBookings}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Total Spent</Typography>
                <Typography variant="body" style={styles.detailValue}>₹{stats.totalSpent.toFixed(0)}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Average Order Value</Typography>
                <Typography variant="body" style={styles.detailValue}>₹{stats.averageOrderValue.toFixed(0)}</Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Saved Addresses ({selectedCustomer.savedAddresses?.length || 0})
              </Typography>
              {selectedCustomer.savedAddresses && selectedCustomer.savedAddresses.length > 0 ? (
                selectedCustomer.savedAddresses.map((address, index) => (
                  <View key={address.id || index} style={styles.addressItem}>
                    <Typography variant="body" style={styles.addressText}>
                      {address.street}, {address.city}, {address.state} - {address.pincode}
                    </Typography>
                    {address.landmark && (
                      <Typography variant="caption" style={styles.landmarkText}>
                        Near: {address.landmark}
                      </Typography>
                    )}
                  </View>
                ))
              ) : (
                <Typography variant="body" style={styles.noAddressText}>
                  No saved addresses
                </Typography>
              )}
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Recent Orders ({customerBookings.length})
              </Typography>
              {customerBookings.slice(0, 5).map((booking) => (
                <View key={booking.id} style={styles.orderItem}>
                  <View style={styles.orderHeader}>
                    <Typography variant="body" style={styles.orderId}>
                      Order #{booking.id.slice(-6)}
                    </Typography>
                    <Typography variant="caption" style={styles.orderDate}>
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </Typography>
                  </View>
                  <Typography variant="caption" style={styles.orderDetails}>
                    {booking.tankerSize}L Tanker • ₹{booking.totalPrice} • {booking.status}
                  </Typography>
                  <Typography variant="caption" style={styles.orderAddress}>
                    {booking.deliveryAddress.city}, {booking.deliveryAddress.state}
                  </Typography>
                </View>
              ))}
              {customerBookings.length === 0 && (
                <Typography variant="body" style={styles.noOrdersText}>
                  No orders yet
                </Typography>
              )}
            </Card>

            <View style={styles.modalActions}>
              <Button
                title="Call Customer"
                onPress={() => {
                  setShowCustomerModal(false);
                  handleCallCustomer(selectedCustomer.phone);
                }}
                style={styles.callButton}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const stats = {
    total: customers.length,
    active: customers.filter(c => {
      const customerBookings = getCustomerBookings(c.uid);
      return customerBookings.some(booking => {
        const bookingDate = new Date(booking.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return bookingDate > thirtyDaysAgo;
      });
    }).length,
    inactive: customers.filter(c => {
      const customerBookings = getCustomerBookings(c.uid);
      return !customerBookings.some(booking => {
        const bookingDate = new Date(booking.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return bookingDate > thirtyDaysAgo;
      });
    }).length,
    totalRevenue: customers.reduce((sum, customer) => {
      const customerBookings = getCustomerBookings(customer.uid);
      return sum + customerBookings
        .filter(b => b.status === 'delivered')
        .reduce((customerSum, b) => customerSum + b.totalPrice, 0);
    }, 0),
  };

  if ((usersLoading || bookingsLoading) && customers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading customers...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h2" style={styles.title}>
            Customer Management
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Manage customer accounts and view analytics
          </Typography>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.total}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Total Customers</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.active}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Active</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.inactive}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Inactive</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>₹{stats.totalRevenue.toFixed(0)}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Total Revenue</Typography>
            </Card>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Typography 
                  variant="caption" 
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Customers List */}
        <View style={styles.customersSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Customers ({filteredCustomers.length})
          </Typography>
          
          {filteredCustomers.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyText}>
                {searchQuery || filterStatus !== 'all' 
                  ? 'No customers found matching your criteria'
                  : 'No customers registered yet'
                }
              </Typography>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <CustomerCard key={customer.uid} customer={customer} />
            ))
          )}
        </View>
      </ScrollView>

      <CustomerModal />
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
    padding: UI_CONFIG.spacing.md,
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
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
    color: '#FFFFFF',
  },
  customersSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  customerCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  customerCardContent: {
    padding: UI_CONFIG.spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customerDetails: {
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
  customerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: UI_CONFIG.spacing.xs,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
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
    paddingVertical: UI_CONFIG.spacing.md,
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
  addressItem: {
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  addressText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  landmarkText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  noAddressText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: UI_CONFIG.spacing.md,
  },
  orderItem: {
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderId: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  orderDetails: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 2,
  },
  orderAddress: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  noOrdersText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: UI_CONFIG.spacing.md,
  },
  modalActions: {
    marginTop: UI_CONFIG.spacing.lg,
  },
  callButton: {
    backgroundColor: '#007AFF',
  },
});

export default CustomerManagementScreen;
