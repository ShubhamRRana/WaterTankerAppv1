import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { Typography, AdminMenuDrawer, MonthYearFilterRow } from '../../components/common';
import { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { PricingUtils } from '../../utils/pricing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import {
  calculateMonthlyData,
  calculateDailyBreakdown,
} from '../../utils/reportCalculations';
import { errorLogger } from '../../utils/errorLogger';
import { exportReportToExcel } from '../../utils/excelExport';

type ReportsScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Reports'>;

const ReportsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const { bookings, fetchAllBookings } = useBookingStore();
  const { logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [menuVisible, setMenuVisible] = useState(false);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      await fetchAllBookings();
    } catch (error) {
          }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const monthlyData = calculateMonthlyData(bookings, selectedYear, selectedMonth);
  const totalRevenue = monthlyData.totalRevenue;
  const totalOrders = monthlyData.totalOrders;
  const dailyBreakdown = calculateDailyBreakdown(bookings, selectedYear, selectedMonth);

  const paymentMetrics = useMemo(() => {
    const monthBookings = bookings.filter((b) => {
      const d = b.deliveredAt ?? b.updatedAt;
      return (
        d.getFullYear() === selectedYear &&
        d.getMonth() === selectedMonth &&
        b.status === 'delivered'
      );
    });
    const razorpayCollected = monthBookings
      .filter(
        (b) =>
          b.paymentStatus === 'completed' &&
          b.paymentId &&
          !b.paymentId.startsWith('cash_') &&
          !b.paymentId.startsWith('cod_')
      )
      .reduce((sum, b) => sum + (b.deliveredAmount ?? b.totalPrice), 0);
    const pendingCollections = monthBookings
      .filter((b) => b.paymentStatus !== 'completed')
      .reduce((sum, b) => sum + (b.deliveredAmount ?? b.totalPrice), 0);
    return { razorpayCollected, pendingCollections };
  }, [bookings, selectedYear, selectedMonth]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'Reports') {
      return;
    }
    navigation.navigate(route);
  };

  const handleDownloadExcel = async () => {
    try {
      await exportReportToExcel(
        'month',
        selectedYear,
        selectedMonth,
        totalRevenue,
        totalOrders,
        dailyBreakdown,
        []
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export report. Please try again.');
      errorLogger.medium('Failed to export report', error);
    }
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
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.title}>
                Reports & Analytics
              </Typography>
              <Typography variant="body" style={styles.subtitle}>
                Comprehensive business insights
              </Typography>
            </View>
            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={handleDownloadExcel}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <MonthYearFilterRow
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />

        {/* Summary */}
        <View style={styles.summarySection}>
          <Typography variant="h2" style={styles.summaryTitle}>
            {`${months[selectedMonth]} ${selectedYear} Summary`}
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
                  {PricingUtils.formatPrice(totalRevenue)}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Revenue
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
                  {PricingUtils.formatNumber(totalOrders)}
                </Typography>
              </View>
              <Typography variant="body" style={styles.summaryLabel}>
                Total Orders
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Typography variant="h2" style={styles.summaryTitle}>
            Delivery payments (Razorpay)
          </Typography>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Typography variant="h1" style={styles.summaryValue}>
                {PricingUtils.formatPrice(paymentMetrics.razorpayCollected)}
              </Typography>
              <Typography variant="body" style={styles.summaryLabel}>
                Collected online
              </Typography>
            </View>
            <View style={styles.summaryMetric}>
              <Typography variant="h1" style={styles.summaryValue}>
                {PricingUtils.formatPrice(paymentMetrics.pendingCollections)}
              </Typography>
              <Typography variant="body" style={styles.summaryLabel}>
                Pending collections
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.dailySection}>
          <View style={styles.dailyHeader}>
            <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderLeft]}>
              Day
            </Typography>
            <Typography variant="body" style={[styles.dailyHeaderText, styles.dailyHeaderCenter]}>
              Revenue
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
                {PricingUtils.formatPrice(item.revenue)}
              </Typography>
              <Typography variant="body" style={styles.dailyOrders}>
                {item.orders}
              </Typography>
            </View>
          ))}
        </View>

      </ScrollView>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Reports"
      />
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  downloadButton: {
    padding: 8,
    marginLeft: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summarySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.accent,
    textAlign: 'center',
    width: '100%',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
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
    borderBottomColor: colors.border,
    marginBottom: UI_CONFIG.spacing.sm,
  },
  dailyHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  dailyDay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.accent,
  },
  dailyRevenue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  dailyOrders: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
});
}


export default ReportsScreen;