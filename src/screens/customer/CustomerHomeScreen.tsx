import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { CustomerTabParamList, CustomerStackParamList } from '../../navigation/CustomerNavigator';

const { width } = Dimensions.get('window');

type CustomerHomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CustomerTabParamList, 'Home'>,
  StackNavigationProp<CustomerStackParamList>
>;

interface CustomerHomeScreenProps {
  navigation: CustomerHomeScreenNavigationProp;
}

const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    fetchCustomerBookings,
    error: bookingError 
  } = useBookingStore();
  const { 
    isLoading: userLoading, 
    updateUser,
    error: userError 
  } = useUserStore();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (user?.uid) {
      loadCustomerData();
    }
  }, [user?.uid]);

  const loadCustomerData = async () => {
    if (!user?.uid) return;
    
    try {
      await fetchCustomerBookings(user.uid);
    } catch (error) {
      console.error('Failed to load customer data:', error);
    }
  };

  const calculateStats = () => {
    if (!bookings.length) return;

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => 
      ['pending', 'accepted', 'in_transit'].includes(b.status)
    ).length;
    const completedBookings = bookings.filter(b => 
      b.status === 'delivered'
    ).length;
    const totalSpent = bookings
      .filter(b => b.status === 'delivered')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    setStats({
      totalBookings,
      pendingBookings,
      completedBookings,
      totalSpent,
    });
  };

  useEffect(() => {
    calculateStats();
  }, [bookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomerData();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
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
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
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

  const recentBookings = bookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(0)}`;
  };

  if (bookingsLoading && !bookings.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading your dashboard...</Typography>
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
        <View style={styles.headerContent}>
          <View>
            <Typography variant="body" style={styles.greeting}>Good {getGreeting()},</Typography>
            <Typography variant="h2" style={styles.userName}>Hi, {user?.name || 'User'}</Typography>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Quick Actions</Typography>
        <View style={styles.quickActions}>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('Booking')}>
            <View style={styles.actionContent}>
              <Ionicons name="add-circle" size={32} color="#007AFF" />
              <Typography variant="body" style={styles.actionText}>Book Tanker</Typography>
            </View>
          </Card>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('SavedAddresses')}>
            <View style={styles.actionContent}>
              <Ionicons name="location" size={32} color="#34C759" />
              <Typography variant="body" style={styles.actionText}>Saved Addresses</Typography>
            </View>
          </Card>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.actionContent}>
              <Ionicons name="list" size={32} color="#FF9500" />
              <Typography variant="body" style={styles.actionText}>Order History</Typography>
            </View>
          </Card>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Your Statistics</Typography>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Typography variant="h2" style={styles.statNumber}>{stats.totalBookings}</Typography>
            <Typography variant="caption" style={styles.statLabel}>Total Bookings</Typography>
          </Card>
          <Card style={styles.statCard}>
            <Typography variant="h2" style={styles.statNumber}>{stats.pendingBookings}</Typography>
            <Typography variant="caption" style={styles.statLabel}>Active Orders</Typography>
          </Card>
          <Card style={styles.statCard}>
            <Typography variant="h2" style={styles.statNumber}>{stats.completedBookings}</Typography>
            <Typography variant="caption" style={styles.statLabel}>Completed</Typography>
          </Card>
          <Card style={styles.statCard}>
            <Typography variant="h2" style={styles.statNumber}>{formatPrice(stats.totalSpent)}</Typography>
            <Typography variant="caption" style={styles.statLabel}>Total Spent</Typography>
          </Card>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Typography variant="h3" style={styles.sectionTitle}>Recent Orders</Typography>
        {recentBookings.length > 0 ? (
          recentBookings.map((booking) => (
            <Card 
              key={booking.id} 
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderTracking', { orderId: booking.id })}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Typography variant="body" style={styles.orderId}>Order #{booking.id.slice(-6)}</Typography>
                  <Typography variant="caption" style={styles.orderDate}>{formatDate(booking.scheduledFor || booking.createdAt)}</Typography>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Typography variant="caption" style={styles.statusText}>{getStatusText(booking.status)}</Typography>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <Typography variant="body" style={styles.tankerSize}>{booking.tankerSize}L Tanker</Typography>
                <Typography variant="body" style={styles.orderPrice}>{formatPrice(booking.totalPrice)}</Typography>
              </View>
              <Typography variant="caption" style={styles.deliveryAddress}>
                {booking.deliveryAddress.street}, {booking.deliveryAddress.city}
              </Typography>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#8E8E93" />
            <Typography variant="body" style={styles.emptyStateText}>No orders yet</Typography>
            <Typography variant="caption" style={styles.emptyStateSubtext}>Book your first tanker to get started</Typography>
          </Card>
        )}
      </View>

      {/* Error Messages */}
      {(bookingError || userError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {bookingError || userError}
          </Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 20,
  },
  actionContent: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tankerSize: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

export default CustomerHomeScreen;
