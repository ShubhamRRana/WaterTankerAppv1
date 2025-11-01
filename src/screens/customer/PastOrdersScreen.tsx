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
import { StackNavigationProp } from '@react-navigation/stack';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';

const { width } = Dimensions.get('window');

type PastOrdersScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'PastOrders'>;

interface PastOrdersScreenProps {
  navigation: PastOrdersScreenNavigationProp;
}

const PastOrdersScreen: React.FC<PastOrdersScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { bookings, fetchCustomerBookings } = useBookingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate year options (current year + 4 previous years)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  const availableYears = getAvailableYears();

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    if (!user?.uid) return;
    try {
      await fetchCustomerBookings(user.uid);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  };

  const calculateMonthlyData = () => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const monthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });

    const completedBookings = monthBookings.filter(b => b.status === 'delivered');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalOrders = completedBookings.length;

    return { totalRevenue, totalOrders };
  };

  const calculateDailyBreakdown = () => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(selectedYear, selectedMonth, day, 0, 0, 0, 0);
      const dayEnd = new Date(selectedYear, selectedMonth, day, 23, 59, 59, 999);

      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= dayStart && bookingDate <= dayEnd && booking.status === 'delivered';
      });

      const dayRevenue = dayBookings.reduce((sum, b) => sum + b.totalPrice, 0);
      const dayOrders = dayBookings.length;

      dailyData.push({
        day,
        revenue: dayRevenue,
        orders: dayOrders,
      });
    }

    return dailyData;
  };

  const calculateYearlyData = () => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    const yearBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= yearStart && bookingDate <= yearEnd;
    });

    const completedBookings = yearBookings.filter(b => b.status === 'delivered');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalOrders = completedBookings.length;

    return { totalRevenue, totalOrders };
  };

  const calculateMonthlyBreakdown = () => {
    const monthlyData = [];
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthStart = new Date(selectedYear, monthIndex, 1);
      const monthEnd = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999);

      const monthBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= monthStart && bookingDate <= monthEnd && booking.status === 'delivered';
      });

      const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
      const monthOrders = monthBookings.length;

      monthlyData.push({
        month: fullMonthNames[monthIndex],
        revenue: monthRevenue,
        orders: monthOrders,
      });
    }

    return monthlyData;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const monthlyData = periodType === 'month' ? calculateMonthlyData() : calculateYearlyData();
  const totalRevenue = monthlyData.totalRevenue;
  const totalOrders = monthlyData.totalOrders;
  const dailyBreakdown = periodType === 'month' ? calculateDailyBreakdown() : [];
  const monthlyBreakdown = periodType === 'year' ? calculateMonthlyBreakdown() : [];

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Typography variant="h2" style={styles.title}>
              Past Orders
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Your order history & analytics
            </Typography>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Period Type Toggle */}
        <View style={styles.periodTypeToggle}>
          <TouchableOpacity
            style={[
              styles.periodTypeButton,
              periodType === 'month' && styles.periodTypeButtonActive
            ]}
            onPress={() => setPeriodType('month')}
          >
            <Typography 
              variant="body" 
              style={[
                styles.periodTypeText,
                periodType === 'month' && styles.periodTypeTextActive
              ]}
            >
              Month
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodTypeButton,
              periodType === 'year' && styles.periodTypeButtonActive
            ]}
            onPress={() => setPeriodType('year')}
          >
            <Typography 
              variant="body" 
              style={[
                styles.periodTypeText,
                periodType === 'year' && styles.periodTypeTextActive
              ]}
            >
              Year
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        {periodType === 'month' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            {months.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthButton,
                  selectedMonth === index && styles.monthButtonActive
                ]}
                onPress={() => setSelectedMonth(index)}
              >
                <Typography 
                  variant="body" 
                  style={[
                    styles.monthButtonText,
                    selectedMonth === index && styles.monthButtonTextActive
                  ]}
                >
                  {month}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Year Selector */}
        {periodType === 'year' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.monthButton,
                  selectedYear === year && styles.monthButtonActive
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Typography 
                  variant="body" 
                  style={[
                    styles.monthButtonText,
                    selectedYear === year && styles.monthButtonTextActive
                  ]}
                >
                  {year}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Summary */}
        <View style={styles.summarySection}>
          <Typography variant="h2" style={styles.summaryTitle}>
            {periodType === 'month' ? 'Monthly Summary' : `Yearly Summary - ${selectedYear}`}
          </Typography>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <View style={styles.summaryValueContainer}>
                <Typography 
                  variant="h1" 
                  style={styles.summaryValue} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.6}
                >
                  ₹{totalRevenue.toLocaleString()}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Spent
              </Typography>
            </View>
            <View style={styles.summaryMetric}>
              <View style={styles.summaryValueContainer}>
                <Typography 
                  variant="h1" 
                  style={styles.summaryValue} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.6}
                >
                  {totalOrders.toLocaleString()}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Orders
              </Typography>
            </View>
          </View>
        </View>

        {/* Daily Breakdown - Month View */}
        {periodType === 'month' && (
          <View style={styles.dailySection}>
            <View style={styles.dailyHeader}>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
                Day
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
                Spent
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderRight]}>
                Orders
              </Typography>
            </View>
            {dailyBreakdown.map((item, index) => (
              <View key={index} style={styles.dailyRow}>
                <Typography variant="body" style={styles.dailyDay}>
                  {item.day}
                </Typography>
                <Typography variant="body" style={styles.dailyRevenue}>
                  ₹{item.revenue.toLocaleString()}
                </Typography>
                <Typography variant="body" style={styles.dailyOrders}>
                  {item.orders}
                </Typography>
              </View>
            ))}
          </View>
        )}

        {/* Monthly Breakdown - Year View */}
        {periodType === 'year' && (
          <View style={styles.dailySection}>
            <View style={styles.dailyHeader}>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
                Month
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
                Spent
              </Typography>
              <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderRight]}>
                Orders
              </Typography>
            </View>
            {monthlyBreakdown.map((item, index) => (
              <View key={index} style={styles.dailyRow}>
                <Typography variant="body" style={styles.dailyDay}>
                  {item.month}
                </Typography>
                <Typography variant="body" style={styles.dailyRevenue}>
                  ₹{item.revenue.toLocaleString()}
                </Typography>
                <Typography variant="body" style={styles.dailyOrders}>
                  {item.orders}
                </Typography>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 12,
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
  periodTypeToggle: {
    flexDirection: 'row',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
  },
  periodTypeButton: {
    flex: 1,
    paddingVertical: UI_CONFIG.spacing.sm,
    paddingHorizontal: UI_CONFIG.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
  },
  periodTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  periodTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  monthButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  monthButtonTextActive: {
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  summarySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.lg,
  },
  summaryMetrics: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    maxWidth: '50%',
  },
  summaryValueContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    width: '100%',
  },
  summaryLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  dailySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.lg,
  },
  dailyHeader: {
    flexDirection: 'row',
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: UI_CONFIG.spacing.sm,
  },
  dailyHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
  },
  dailyHeaderLeft: {
    flex: 1,
    textAlign: 'left',
  },
  dailyHeaderCenter: {
    flex: 1,
    textAlign: 'center',
  },
  dailyHeaderRight: {
    flex: 1,
    textAlign: 'right',
  },
  dailyRow: {
    flexDirection: 'row',
    paddingVertical: UI_CONFIG.spacing.md,
    paddingHorizontal: UI_CONFIG.spacing.sm,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  dailyDay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  dailyRevenue: {
    flex: 1,
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    textAlign: 'center',
  },
  dailyOrders: {
    flex: 1,
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default PastOrdersScreen;

