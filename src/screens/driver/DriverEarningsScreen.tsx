import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Booking, DriverDashboardStats, isDriverUser } from '../../types';
import { errorLogger } from '../../utils/errorLogger';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

/** Delivered bookings scoped to the driver's agency (booking.agency_id = admin who created the driver). */
function bookingsForDriverAgency(bookings: Booking[], agencyId: string | undefined): Booking[] {
  if (!agencyId) return bookings;
  return bookings.filter((b) => b.agencyId === agencyId);
}

const DriverEarningsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuthStore();
  const { isLoading, fetchDriverBookings, fetchDriverBookingsForEarnings } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [earningsStats, setEarningsStats] = useState<DriverDashboardStats | null>(null);

  const calculateEarningsStats = useCallback(async () => {
    if (!user?.id) {
      setEarningsStats({
        pendingOrders: 0,
        activeOrders: 0,
        todayCompletedOrders: 0,
        weeklyCompletedOrders: 0,
        monthlyCompletedOrders: 0,
        averageRating: 0,
        totalRatings: 0,
        isOnline: true,
        lastActiveAt: new Date(),
      });
      return;
    }

    const agencyId = isDriverUser(user) ? user.createdByAdminId : undefined;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayBookings, weeklyBookings, monthlyBookings] = await Promise.all([
      fetchDriverBookingsForEarnings(user.id, { startDate: today }),
      fetchDriverBookingsForEarnings(user.id, { startDate: weekStart }),
      fetchDriverBookingsForEarnings(user.id, { startDate: monthStart }),
    ]);

    const scopedToday = bookingsForDriverAgency(todayBookings, agencyId);
    const scopedWeek = bookingsForDriverAgency(weeklyBookings, agencyId);
    const scopedMonth = bookingsForDriverAgency(monthlyBookings, agencyId);

    await Promise.all([
      fetchDriverBookings(user.id, { status: ['pending'], limit: 100 }),
      fetchDriverBookings(user.id, { status: ['accepted', 'in_transit'], limit: 100 }),
    ]);

    const { bookings } = useBookingStore.getState();
    const matchesAgency = (b: Booking) =>
      !agencyId || b.agencyId === agencyId;
    const pendingCount = bookings.filter(
      (b) => b.status === 'pending' && b.driverId === user.id && matchesAgency(b)
    ).length;
    const activeCount = bookings.filter(
      (b) =>
        (b.status === 'accepted' || b.status === 'in_transit') &&
        b.driverId === user.id &&
        matchesAgency(b)
    ).length;

    setEarningsStats({
      pendingOrders: pendingCount,
      activeOrders: activeCount,
      todayCompletedOrders: scopedToday.length,
      weeklyCompletedOrders: scopedWeek.length,
      monthlyCompletedOrders: scopedMonth.length,
      averageRating: 4.8,
      totalRatings: scopedMonth.length,
      isOnline: true,
      lastActiveAt: new Date(),
    });
  }, [user, fetchDriverBookingsForEarnings, fetchDriverBookings]);

  const loadDriverData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Calculate earnings with optimized date-filtered queries
      await calculateEarningsStats();
    } catch (error) {
      errorLogger.medium('Failed to load driver completed orders data', error, { userId: user.id });
    }
  }, [user?.id, calculateEarningsStats]);

  useEffect(() => {
    if (user?.id) {
      loadDriverData();
    }
  }, [user?.id, loadDriverData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadDriverData();
      }
    }, [user?.id, loadDriverData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    setRefreshing(false);
  };

  if (isLoading && !earningsStats) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Typography variant="body" style={styles.loadingText}>
          Loading completed orders...
        </Typography>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={styles.header}>
        <Typography variant="h1" style={styles.headerTitle}>
          Completed orders
        </Typography>
        <Typography variant="body" style={styles.headerSubtitle}>
          Deliveries completed for your agency
        </Typography>
      </View>

      <View style={styles.earningsContainer}>
        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="sunny-outline" size={24} color={colors.warning} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              Today
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {earningsStats?.todayCompletedOrders ?? 0}
          </Typography>
        </Card>

        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="calendar-outline" size={24} color={colors.accent} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              This week
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {earningsStats?.weeklyCompletedOrders ?? 0}
          </Typography>
        </Card>

        <Card style={styles.earningsCard}>
          <View style={styles.earningsCardHeader}>
            <Ionicons name="calendar-number-outline" size={24} color={colors.success} />
            <Typography variant="h3" style={styles.earningsCardTitle}>
              This month
            </Typography>
          </View>
          <Typography variant="h1" style={styles.earningsCardAmount}>
            {earningsStats?.monthlyCompletedOrders ?? 0}
          </Typography>
        </Card>
      </View>
    </ScrollView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      color: colors.textSecondary,
    },
    header: {
      padding: 24,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      color: colors.textSecondary,
    },
    earningsContainer: {
      padding: 24,
      gap: 16,
    },
    earningsCard: {
      padding: 20,
      marginBottom: 0,
    },
    earningsCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    earningsCardTitle: {
      color: colors.text,
      fontWeight: '600',
    },
    earningsCardAmount: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}

export default DriverEarningsScreen;