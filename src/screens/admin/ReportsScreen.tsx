import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../../store/bookingStore';
import { useUserStore } from '../../store/userStore';
import { Typography, Card, Button } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { ReportData } from '../../types';

const { width } = Dimensions.get('window');

const ReportsScreen: React.FC = () => {
  const { bookings, fetchAllBookings, isLoading: bookingsLoading } = useBookingStore();
  const { users, fetchAllUsers, isLoading: usersLoading } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [reportData, setReportData] = useState<ReportData>({
    totalBookings: 0,
    totalRevenue: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    activeDrivers: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    topDrivers: [],
    topCustomers: [],
    bookingsByStatus: [],
    revenueByMonth: [],
  });

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    calculateReportData();
  }, [bookings, users, selectedPeriod]);

  const loadReportData = async () => {
    try {
      await Promise.all([
        fetchAllBookings(),
        fetchAllUsers(),
      ]);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  };

  const calculateReportData = () => {
    const now = new Date();
    const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter data by selected period
    const filteredBookings = bookings.filter(booking => 
      new Date(booking.createdAt) >= startDate
    );

    const customers = users.filter(user => user.role === 'customer');
    const drivers = users.filter(user => user.role === 'driver');
    const activeDrivers = drivers.filter(driver => driver.isAvailable);

    // Calculate basic metrics
    const totalBookings = filteredBookings.length;
    const completedBookings = filteredBookings.filter(b => b.status === 'delivered').length;
    const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
    const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
    
    const totalRevenue = filteredBookings
      .filter(b => b.status === 'delivered')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const averageOrderValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    // Calculate top drivers
    const driverEarnings = new Map<string, { name: string; earnings: number; orders: number }>();
    filteredBookings
      .filter(b => b.status === 'delivered' && b.driverId)
      .forEach(booking => {
        const existing = driverEarnings.get(booking.driverId!) || { 
          name: booking.driverName || 'Unknown', 
          earnings: 0, 
          orders: 0 
        };
        driverEarnings.set(booking.driverId!, {
          name: booking.driverName || 'Unknown',
          earnings: existing.earnings + (booking.totalPrice * 0.7), // Assuming 70% driver commission
          orders: existing.orders + 1
        });
      });

    const topDrivers = Array.from(driverEarnings.values())
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    // Calculate top customers
    const customerStats = new Map<string, { name: string; orders: number; totalSpent: number }>();
    filteredBookings
      .filter(b => b.status === 'delivered')
      .forEach(booking => {
        const existing = customerStats.get(booking.customerId) || { 
          name: booking.customerName, 
          orders: 0, 
          totalSpent: 0 
        };
        customerStats.set(booking.customerId, {
          name: booking.customerName,
          orders: existing.orders + 1,
          totalSpent: existing.totalSpent + booking.totalPrice
        });
      });

    const topCustomers = Array.from(customerStats.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Calculate bookings by status
    const statusCounts = {
      pending: pendingBookings,
      accepted: filteredBookings.filter(b => b.status === 'accepted').length,
      in_transit: filteredBookings.filter(b => b.status === 'in_transit').length,
      delivered: completedBookings,
      cancelled: cancelledBookings,
    };

    const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      count,
      percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0
    }));

    // Calculate revenue by month (last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthRevenue = filteredBookings
        .filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= monthStart && bookingDate <= monthEnd && b.status === 'delivered';
        })
        .reduce((sum, b) => sum + b.totalPrice, 0);

      revenueByMonth.push({
        month: monthName,
        revenue: monthRevenue
      });
    }

    setReportData({
      totalBookings,
      totalRevenue,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      activeDrivers: activeDrivers.length,
      totalCustomers: customers.length,
      averageOrderValue,
      topDrivers,
      topCustomers,
      bookingsByStatus,
      revenueByMonth,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
  }> = ({ title, value, icon, color, subtitle, trend }) => (
    <Card style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={20} color="#FFFFFF" />
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
        {trend && (
          <Ionicons 
            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'} 
            size={16} 
            color={trend === 'up' ? '#34C759' : trend === 'down' ? '#FF3B30' : '#8E8E93'} 
          />
        )}
      </View>
    </Card>
  );

  const PeriodSelector: React.FC = () => (
    <View style={styles.periodSelector}>
      {(['7d', '30d', '90d', '1y'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Typography 
            variant="body" 
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}
          >
            {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
          </Typography>
        </TouchableOpacity>
      ))}
    </View>
  );

  const SimpleBarChart: React.FC<{ data: Array<{ month: string; revenue: number }> }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.revenue));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: maxValue > 0 ? (item.revenue / maxValue) * 100 : 0,
                    backgroundColor: '#007AFF'
                  }
                ]} 
              />
              <Typography variant="caption" style={styles.barLabel}>
                {item.month}
              </Typography>
              <Typography variant="caption" style={styles.barValue}>
                ₹{item.revenue.toLocaleString()}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const PieChart: React.FC<{ data: Array<{ status: string; count: number; percentage: number }> }> = ({ data }) => {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'];
    
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => (
            <View key={index} style={styles.pieItem}>
              <View style={[styles.pieColor, { backgroundColor: colors[index % colors.length] }]} />
              <Typography variant="caption" style={styles.pieLabel}>
                {item.status}: {item.count} ({item.percentage.toFixed(1)}%)
              </Typography>
            </View>
          ))}
        </View>
      </View>
    );
  };

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
            Reports & Analytics
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Comprehensive business insights
          </Typography>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Time Period
          </Typography>
          <PeriodSelector />
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Key Metrics
          </Typography>
          <View style={styles.metricsGrid}>
            <StatCard
              title="Total Bookings"
              value={reportData.totalBookings}
              icon="receipt-outline"
              color="#007AFF"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${reportData.totalRevenue.toLocaleString()}`}
              icon="cash-outline"
              color="#34C759"
            />
            <StatCard
              title="Completed Orders"
              value={reportData.completedBookings}
              icon="checkmark-circle-outline"
              color="#34C759"
            />
            <StatCard
              title="Avg Order Value"
              value={`₹${reportData.averageOrderValue.toFixed(0)}`}
              icon="analytics-outline"
              color="#5856D6"
            />
            <StatCard
              title="Active Drivers"
              value={reportData.activeDrivers}
              icon="car-outline"
              color="#FF9500"
            />
            <StatCard
              title="Total Customers"
              value={reportData.totalCustomers}
              icon="people-outline"
              color="#32D74B"
            />
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Revenue Trend
          </Typography>
          <Card style={styles.chartCard}>
            <SimpleBarChart data={reportData.revenueByMonth} />
          </Card>
        </View>

        {/* Bookings Status */}
        <View style={styles.statusSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Bookings by Status
          </Typography>
          <Card style={styles.statusCard}>
            <PieChart data={reportData.bookingsByStatus} />
          </Card>
        </View>

        {/* Top Performers */}
        <View style={styles.performersSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Top Performers
          </Typography>
          
          {/* Top Drivers */}
          <Card style={styles.performerCard}>
            <Typography variant="h3" style={styles.performerTitle}>
              Top Drivers
            </Typography>
            {reportData.topDrivers.map((driver, index) => (
              <View key={index} style={styles.performerItem}>
                <View style={styles.performerRank}>
                  <Typography variant="body" style={styles.rankNumber}>
                    #{index + 1}
                  </Typography>
                </View>
                <View style={styles.performerInfo}>
                  <Typography variant="body" style={styles.performerName}>
                    {driver.name}
                  </Typography>
                  <Typography variant="caption" style={styles.performerStats}>
                    {driver.orders} orders • ₹{driver.earnings.toLocaleString()} earned
                  </Typography>
                </View>
              </View>
            ))}
            {reportData.topDrivers.length === 0 && (
              <Typography variant="body" style={styles.emptyText}>
                No driver data available
              </Typography>
            )}
          </Card>

          {/* Top Customers */}
          <Card style={styles.performerCard}>
            <Typography variant="h3" style={styles.performerTitle}>
              Top Customers
            </Typography>
            {reportData.topCustomers.map((customer, index) => (
              <View key={index} style={styles.performerItem}>
                <View style={styles.performerRank}>
                  <Typography variant="body" style={styles.rankNumber}>
                    #{index + 1}
                  </Typography>
                </View>
                <View style={styles.performerInfo}>
                  <Typography variant="body" style={styles.performerName}>
                    {customer.name}
                  </Typography>
                  <Typography variant="caption" style={styles.performerStats}>
                    {customer.orders} orders • ₹{customer.totalSpent.toLocaleString()} spent
                  </Typography>
                </View>
              </View>
            ))}
            {reportData.topCustomers.length === 0 && (
              <Typography variant="body" style={styles.emptyText}>
                No customer data available
              </Typography>
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
  periodSection: {
    padding: UI_CONFIG.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: UI_CONFIG.spacing.sm,
    paddingHorizontal: UI_CONFIG.spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: UI_CONFIG.colors.textSecondary,
  },
  periodButtonTextActive: {
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  metricsSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  metricsGrid: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.spacing.md,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 10,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  chartSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  chartCard: {
    padding: UI_CONFIG.spacing.md,
  },
  chartContainer: {
    height: 200,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: UI_CONFIG.spacing.md,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  barLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 10,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  statusSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  statusCard: {
    padding: UI_CONFIG.spacing.md,
  },
  pieChartContainer: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  pieChart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  pieColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: UI_CONFIG.spacing.sm,
  },
  pieLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    flex: 1,
  },
  performersSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  performerCard: {
    marginBottom: UI_CONFIG.spacing.md,
    padding: UI_CONFIG.spacing.md,
  },
  performerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  performerRank: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  performerInfo: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.md,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  performerStats: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: UI_CONFIG.spacing.lg,
  },
});

export default ReportsScreen;
