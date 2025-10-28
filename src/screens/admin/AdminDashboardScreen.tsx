import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import { Typography, Card, Button } from '../../components/common';
import { DashboardStats } from '../../types';
import { UI_CONFIG } from '../../constants/config';

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, user } = useAuthStore();
  const { bookings, fetchAllBookings, isLoading: bookingsLoading } = useBookingStore();
  const { users, fetchAllUsers, isLoading: usersLoading } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchAllBookings(),
        fetchAllUsers(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const calculateStats = () => {
    const customers = users.filter(user => user.role === 'customer');
    const drivers = users.filter(user => user.role === 'driver');
    const activeDrivers = drivers.filter(driver => driver.isAvailable);
    
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(booking => booking.status === 'pending').length;
    const completedBookings = bookings.filter(booking => booking.status === 'delivered').length;
    const totalRevenue = bookings
      .filter(booking => booking.status === 'delivered')
      .reduce((sum, booking) => sum + booking.totalPrice, 0);

    setStats({
      totalBookings,
      pendingBookings,
      completedBookings,
      totalRevenue,
      activeDrivers: activeDrivers.length,
      totalCustomers: customers.length,
    });
  };

  useEffect(() => {
    calculateStats();
  }, [bookings, users]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
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

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.statText}>
          <Typography variant="h3" style={styles.statValue}>
            {value}
          </Typography>
          <Typography variant="body" style={styles.statTitle}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" style={styles.statSubtitle}>
              {subtitle}
            </Typography>
          )}
        </View>
      </View>
    </Card>
  );


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
            <Typography variant="h2" style={styles.title}>
              Admin Dashboard
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Welcome back, {user?.name || 'Admin'}
            </Typography>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Platform Overview
          </Typography>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Bookings"
              value={stats.totalBookings}
              icon="receipt-outline"
              color="#007AFF"
            />
            <StatCard
              title="Pending Orders"
              value={stats.pendingBookings}
              icon="time-outline"
              color="#FF9500"
            />
            <StatCard
              title="Completed Orders"
              value={stats.completedBookings}
              icon="checkmark-circle-outline"
              color="#34C759"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              icon="cash-outline"
              color="#5856D6"
            />
            <StatCard
              title="Active Drivers"
              value={stats.activeDrivers}
              icon="car-outline"
              color="#FF3B30"
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon="people-outline"
              color="#32D74B"
            />
          </View>
        </View>


        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Recent Activity
          </Typography>
          <Card style={styles.activityCard}>
            {bookings.slice(0, 5).map((booking, index) => (
              <View key={booking.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons 
                    name="water-outline" 
                    size={20} 
                    color={UI_CONFIG.colors.primary} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Typography variant="body" style={styles.activityTitle}>
                    {booking.customerName} - {booking.tankerSize}L Tanker
                  </Typography>
                  <Typography variant="caption" style={styles.activitySubtitle}>
                    {booking.status} • ₹{booking.totalPrice} • {booking.deliveryAddress.city}
                  </Typography>
                </View>
                <Typography variant="caption" style={styles.activityTime}>
                  {new Date(booking.createdAt).toLocaleDateString()}
                </Typography>
              </View>
            ))}
            {bookings.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#8E8E93" />
                <Typography variant="body" style={styles.emptyText}>
                  No bookings yet
                </Typography>
              </View>
            )}
          </Card>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flex: 1,
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
  logoutButton: {
    padding: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
  statsSection: {
    padding: UI_CONFIG.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: UI_CONFIG.spacing.md,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.spacing.md,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  activitySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  activityCard: {
    padding: UI_CONFIG.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  activityTime: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.md,
  },
});

export default AdminDashboardScreen;
