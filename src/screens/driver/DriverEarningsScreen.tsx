import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Booking, DriverDashboardStats } from '../../types';

const { width } = Dimensions.get('window');

interface EarningsPeriod {
  label: string;
  value: 'daily' | 'weekly' | 'monthly';
}

const DriverEarningsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { bookings, isLoading, fetchDriverBookings } = useBookingStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [refreshing, setRefreshing] = useState(false);
  const [earningsStats, setEarningsStats] = useState<DriverDashboardStats | null>(null);

  const periods: EarningsPeriod[] = [
    { label: 'Today', value: 'daily' },
    { label: 'This Week', value: 'weekly' },
    { label: 'This Month', value: 'monthly' },
  ];

  useEffect(() => {
    if (user?.uid) {
      loadDriverData();
    }
  }, [user?.uid, selectedPeriod]);

  const loadDriverData = async () => {
    if (!user?.uid) return;
    
    try {
      await fetchDriverBookings(user.uid);
      calculateEarningsStats();
    } catch (error) {
      console.error('Failed to load driver data:', error);
    }
  };

  const calculateEarningsStats = () => {
    if (!user?.uid || !bookings.length) {
      setEarningsStats({
        totalEarnings: 0,
        completedOrders: 0,
        pendingOrders: 0,
        activeOrders: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        averageRating: 0,
        totalRatings: 0,
        isOnline: true,
        lastActiveAt: new Date(),
      });
      return;
    }

    const driverBookings = bookings.filter(booking => booking.driverId === user.uid);
    const completedBookings = driverBookings.filter(booking => booking.status === 'delivered');
    const pendingBookings = driverBookings.filter(booking => booking.status === 'pending');
    const activeBookings = driverBookings.filter(booking => 
      booking.status === 'accepted' || booking.status === 'in_transit'
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayEarnings = completedBookings
      .filter(booking => booking.deliveredAt && new Date(booking.deliveredAt) >= today)
      .reduce((sum, booking) => sum + booking.totalPrice, 0);

    const weeklyEarnings = completedBookings
      .filter(booking => booking.deliveredAt && new Date(booking.deliveredAt) >= weekStart)
      .reduce((sum, booking) => sum + booking.totalPrice, 0);

    const monthlyEarnings = completedBookings
      .filter(booking => booking.deliveredAt && new Date(booking.deliveredAt) >= monthStart)
      .reduce((sum, booking) => sum + booking.totalPrice, 0);

    const totalEarnings = completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

    setEarningsStats({
      totalEarnings,
      completedOrders: completedBookings.length,
      pendingOrders: pendingBookings.length,
      activeOrders: activeBookings.length,
      todayEarnings,
      weeklyEarnings,
      monthlyEarnings,
      averageRating: 4.8, // Mock rating
      totalRatings: completedBookings.length,
      isOnline: true,
      lastActiveAt: new Date(),
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    setRefreshing(false);
  };

  const getCurrentPeriodEarnings = () => {
    if (!earningsStats) return 0;
    switch (selectedPeriod) {
      case 'daily':
        return earningsStats.todayEarnings;
      case 'weekly':
        return earningsStats.weeklyEarnings;
      case 'monthly':
        return earningsStats.monthlyEarnings;
      default:
        return 0;
    }
  };

  const getCompletedOrdersForPeriod = () => {
    if (!user?.uid || !bookings.length) return [];
    
    const driverBookings = bookings.filter(booking => booking.driverId === user.uid);
    const completedBookings = driverBookings.filter(booking => booking.status === 'delivered');
    
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }
    
    return completedBookings
      .filter(booking => booking.deliveredAt && new Date(booking.deliveredAt) >= startDate)
      .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime());
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDistance = (distance: number): string => {
    return Number(distance).toFixed(2);
  };

  if (isLoading && !earningsStats) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Typography variant="body" style={styles.loadingText}>
          Loading earnings data...
        </Typography>
      </View>
    );
  }

  const currentEarnings = getCurrentPeriodEarnings();
  const completedOrders = getCompletedOrdersForPeriod();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h1" style={styles.headerTitle}>
          Earnings
        </Typography>
        <Typography variant="body" style={styles.headerSubtitle}>
          Track your delivery earnings
        </Typography>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Typography 
              variant="body" 
              style={[
                styles.periodButtonText,
                selectedPeriod === period.value && styles.periodButtonTextActive
              ]}
            >
              {period.label}
            </Typography>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings Overview */}
      <Card style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Typography variant="h2" style={styles.earningsTitle}>
            {selectedPeriod === 'daily' ? 'Today\'s Earnings' : 
             selectedPeriod === 'weekly' ? 'This Week\'s Earnings' : 
             'This Month\'s Earnings'}
          </Typography>
          <Ionicons name="cash-outline" size={24} color="#D4AF37" />
        </View>
        
        <Typography variant="h1" style={styles.earningsAmount}>
          {formatCurrency(currentEarnings)}
        </Typography>
        
        <View style={styles.earningsStats}>
          <View style={styles.statItem}>
            <Typography variant="caption" style={styles.statLabel}>
              Completed Orders
            </Typography>
            <Typography variant="body" style={styles.statValue}>
              {completedOrders.length}
            </Typography>
          </View>
          <View style={styles.statItem}>
            <Typography variant="caption" style={styles.statLabel}>
              Average per Order
            </Typography>
            <Typography variant="body" style={styles.statValue}>
              {completedOrders.length > 0 ? formatCurrency(currentEarnings / completedOrders.length) : '₹0'}
            </Typography>
          </View>
        </View>
      </Card>

      {/* Total Earnings Summary */}
      <Card style={styles.summaryCard}>
        <Typography variant="h3" style={styles.summaryTitle}>
          Total Earnings Summary
        </Typography>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Typography variant="caption" style={styles.summaryLabel}>
              Total Earnings
            </Typography>
            <Typography variant="h3" style={styles.summaryValue}>
              {formatCurrency(earningsStats?.totalEarnings || 0)}
            </Typography>
          </View>
          
          <View style={styles.summaryItem}>
            <Typography variant="caption" style={styles.summaryLabel}>
              Total Orders
            </Typography>
            <Typography variant="h3" style={styles.summaryValue}>
              {earningsStats?.completedOrders || 0}
            </Typography>
          </View>

        </View>
      </Card>

      {/* Transaction History */}
      <View style={styles.historySection}>
        <Typography variant="h3" style={styles.historyTitle}>
          Recent Transactions
        </Typography>
        
        {completedOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color="#8E8E93" />
            <Typography variant="body" style={styles.emptyText}>
              No completed orders for {selectedPeriod === 'daily' ? 'today' : 
              selectedPeriod === 'weekly' ? 'this week' : 'this month'}
            </Typography>
          </Card>
        ) : (
          completedOrders.slice(0, 10).map((order) => (
            <Card key={order.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Typography variant="body" style={styles.transactionCustomer}>
                    {order.customerName}
                  </Typography>
                  <Typography variant="caption" style={styles.transactionDate}>
                    {order.deliveredAt ? `${formatDate(new Date(order.deliveredAt))} at ${formatTime(new Date(order.deliveredAt))}` : ''}
                  </Typography>
                </View>
                <Typography variant="h3" style={styles.transactionAmount}>
                  {formatCurrency(order.totalPrice)}
                </Typography>
              </View>
              
              <View style={styles.transactionDetails}>
                <View style={styles.transactionDetail}>
                  <Typography variant="caption" style={styles.transactionDetailLabel}>
                    Tanker Size
                  </Typography>
                  <Typography variant="body" style={styles.transactionDetailValue}>
                    {order.tankerSize}L
                  </Typography>
                </View>
                
                <View style={styles.transactionDetail}>
                  <Typography variant="caption" style={styles.transactionDetailLabel}>
                    Distance
                  </Typography>
                  <Typography variant="body" style={styles.transactionDetailValue}>
                    {formatDistance(order.distance)} km
                  </Typography>
                </View>
                
                <View style={styles.transactionDetail}>
                  <Typography variant="caption" style={styles.transactionDetailLabel}>
                    Time
                  </Typography>
                  <Typography variant="body" style={styles.transactionDetailValue}>
                    {order.deliveredAt ? formatTime(new Date(order.deliveredAt)) : ''}
                  </Typography>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#8E8E93',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#8E8E93',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  periodButtonText: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  earningsCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    color: '#000000',
    flex: 1,
  },
  earningsAmount: {
    color: '#D4AF37',
    marginBottom: 16,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#8E8E93',
    marginBottom: 4,
  },
  statValue: {
    color: '#000000',
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 14,
  },
  summaryTitle: {
    color: '#000000',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  summaryLabel: {
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  historySection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  historyTitle: {
    color: '#000000',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  transactionCard: {
    marginBottom: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCustomer: {
    color: '#000000',
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#8E8E93',
  },
  transactionAmount: {
    color: '#059669',
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionDetail: {
    alignItems: 'center',
  },
  transactionDetailLabel: {
    color: '#8E8E93',
    marginBottom: 4,
  },
  transactionDetailValue: {
    color: '#000000',
    fontWeight: '500',
  },
});

export default DriverEarningsScreen;
