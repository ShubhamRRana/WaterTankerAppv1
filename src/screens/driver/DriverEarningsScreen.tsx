import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, LoadingSpinner } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Booking, DriverDashboardStats } from '../../types';
import { PricingUtils } from '../../utils/pricing';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateOnly, formatTimeOnly } from '../../utils/dateUtils';

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
  
  // Animation values for glass glider
  const periodGliderAnim = useRef(new Animated.Value(0)).current;
  const [periodOptionWidth, setPeriodOptionWidth] = useState(0);
  const isInitialRender = useRef(true);

  const periods: EarningsPeriod[] = [
    { label: 'Today', value: 'daily' },
    { label: 'This Week', value: 'weekly' },
    { label: 'This Month', value: 'monthly' },
  ];

  const calculateEarningsStats = useCallback(() => {
    if (!user?.id || !bookings.length) {
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

    const driverBookings = bookings.filter(booking => booking.driverId === user.id);
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
  }, [bookings, user?.id]);

  const loadDriverData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await fetchDriverBookings(user.id);
      calculateEarningsStats();
    } catch (error) {
      errorLogger.medium('Failed to load driver bookings', error, { userId: user.id });
    }
  }, [user?.id, fetchDriverBookings, calculateEarningsStats]);

  useEffect(() => {
    if (user?.id) {
      loadDriverData();
    }
  }, [user?.id, selectedPeriod, loadDriverData]);

  // Recalculate earnings when bookings change
  useEffect(() => {
    if (user?.id && bookings.length >= 0) {
      calculateEarningsStats();
    }
  }, [calculateEarningsStats, user?.id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadDriverData();
      }
    }, [user?.id, loadDriverData])
  );

  // Animate glider when selectedPeriod changes
  useEffect(() => {
    if (periodOptionWidth > 0) {
      let periodIndex = 0;
      if (selectedPeriod === 'daily') periodIndex = 0;
      else if (selectedPeriod === 'weekly') periodIndex = 1;
      else if (selectedPeriod === 'monthly') periodIndex = 2;
      
      const targetValue = periodIndex * periodOptionWidth;
      
      if (isInitialRender.current) {
        // Initial render, set position immediately without animation
        periodGliderAnim.setValue(targetValue);
        isInitialRender.current = false;
      } else {
        // Animate to new position
        Animated.spring(periodGliderAnim, {
          toValue: targetValue,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }).start();
      }
    }
  }, [selectedPeriod, periodOptionWidth]);

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
    if (!user?.id || !bookings.length) return [];
    
    const driverBookings = bookings.filter(booking => booking.driverId === user.id);
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
    return PricingUtils.formatPrice(amount);
  };

  const formatDate = (date: Date) => {
    return formatDateOnly(date);
  };

  const formatTime = (date: Date) => {
    return formatTimeOnly(date);
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
        <View style={styles.glassRadioGroup}>
          {periods.map((period, index) => (
            <TouchableOpacity
              key={period.value}
              style={styles.glassRadioOption}
              onPress={() => setSelectedPeriod(period.value)}
              activeOpacity={0.8}
              onLayout={(e) => {
                if (index === 0 && periodOptionWidth === 0) {
                  const width = e.nativeEvent.layout.width;
                  setPeriodOptionWidth(width);
                }
              }}
            >
              <Typography 
                variant="body" 
                style={[
                  styles.glassRadioLabel,
                  selectedPeriod === period.value && styles.glassRadioLabelActive
                ]}
              >
                {period.label}
              </Typography>
            </TouchableOpacity>
          ))}
          {periodOptionWidth > 0 && (
            <Animated.View
              style={[
                styles.glassGlider,
                {
                  width: periodOptionWidth,
                  transform: [{
                    translateX: periodGliderAnim,
                  }],
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Earnings Overview */}
      <Card style={styles.earningsCard}>
        <View style={styles.earningsHeader}>
          <Typography variant="h2" style={styles.earningsTitle}>
            {selectedPeriod === 'daily' ? 'Today\'s Earnings' : 
             selectedPeriod === 'weekly' ? 'This Week\'s Earnings' : 
             'This Month\'s Earnings'}
          </Typography>
          <Ionicons name="cash-outline" size={24} color={UI_CONFIG.colors.warning} />
        </View>
        
        <Typography variant="h1" style={styles.earningsAmount}>
          {formatCurrency(currentEarnings)}
        </Typography>
      </Card>

      {/* Transaction History */}
      <View style={styles.historySection}>
        <Typography variant="h3" style={styles.historyTitle}>
          Recent Transactions
        </Typography>
        
        {completedOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
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
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerTitle: {
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: UI_CONFIG.colors.textSecondary,
  },
  periodSelector: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  glassRadioOption: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12.8,
    paddingHorizontal: 25.6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glassRadioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: UI_CONFIG.colors.text,
  },
  glassRadioLabelActive: {
    color: UI_CONFIG.colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.accent,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
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
    color: UI_CONFIG.colors.text,
    flex: 1,
  },
  earningsAmount: {
    color: UI_CONFIG.colors.accent,
  },
  historySection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  historyTitle: {
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: UI_CONFIG.colors.textSecondary,
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
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    color: UI_CONFIG.colors.textSecondary,
  },
  transactionAmount: {
    color: UI_CONFIG.colors.success,
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
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 4,
  },
  transactionDetailValue: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
});

export default DriverEarningsScreen;