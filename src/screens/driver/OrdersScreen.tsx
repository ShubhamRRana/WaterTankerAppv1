import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, Card, Button, LoadingSpinner } from '../../components/common';
import { Booking, BookingStatus } from '../../types';
import { PRICING_CONFIG, UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

const { width } = Dimensions.get('window');

type OrderTab = 'available' | 'active' | 'completed';

const OrdersScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { bookings, isLoading, fetchAvailableBookings, fetchDriverBookings, updateBookingStatus } = useBookingStore();
  
  const [activeTab, setActiveTab] = useState<OrderTab>('available');
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  
  // Animation values for glass glider
  const tabGliderAnim = useRef(new Animated.Value(0)).current;
  const [tabOptionWidth, setTabOptionWidth] = useState(0);

  useEffect(() => {
    loadOrdersData();
  }, []);

  const tabs = [
    { key: 'available', label: 'Available', icon: 'list-outline' },
    { key: 'active', label: 'Active', icon: 'navigate-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  ] as const;

  // Animate glider when activeTab changes
  useEffect(() => {
    if (tabOptionWidth > 0) {
      const tabIndex = tabs.findIndex(tab => tab.key === activeTab);
      Animated.spring(tabGliderAnim, {
        toValue: tabIndex >= 0 ? tabIndex * tabOptionWidth : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [activeTab, tabOptionWidth]);

  const loadOrdersData = async () => {
    if (!user?.uid) return;
    
    try {
      if (activeTab === 'available') {
        await fetchAvailableBookings();
      } else {
        await fetchDriverBookings(user.uid);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrdersData();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user?.uid) return;
    
    setProcessingOrder(orderId);
    try {
      await updateBookingStatus(orderId, 'accepted', {
        driverId: user.uid,
        driverName: user.name,
        driverPhone: user.phone,
        acceptedAt: new Date(),
      });
      
      Alert.alert('Success', 'Order accepted successfully!');
      await loadOrdersData();
    } catch (error) {
      console.error('Failed to accept order:', error);
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      await updateBookingStatus(orderId, 'in_transit');
      Alert.alert('Success', 'Delivery started!');
      await loadOrdersData();
    } catch (error) {
      console.error('Failed to start delivery:', error);
      Alert.alert('Error', 'Failed to start delivery. Please try again.');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      await updateBookingStatus(orderId, 'delivered', {
        deliveredAt: new Date(),
      });
      Alert.alert('Success', 'Delivery completed successfully!');
      await loadOrdersData();
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      Alert.alert('Error', 'Failed to complete delivery. Please try again.');
    } finally {
      setProcessingOrder(null);
    }
  };

  const getFilteredOrders = (): Booking[] => {
    if (!user?.uid) return [];

    switch (activeTab) {
      case 'available':
        return bookings.filter(booking => 
          booking.status === 'pending' && !booking.driverId
        );
      case 'active':
        return bookings.filter(booking => 
          booking.driverId === user.uid && 
          (booking.status === 'accepted' || booking.status === 'in_transit')
        );
      case 'completed':
        return bookings.filter(booking => 
          booking.driverId === user.uid && booking.status === 'delivered'
        );
      default:
        return [];
    }
  };

  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case 'pending': return UI_CONFIG.colors.warning;
      case 'accepted': return UI_CONFIG.colors.primary;
      case 'in_transit': return UI_CONFIG.colors.success;
      case 'delivered': return UI_CONFIG.colors.success;
      case 'cancelled': return UI_CONFIG.colors.error;
      default: return UI_CONFIG.colors.textSecondary;
    }
  };

  const getStatusText = (status: BookingStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
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

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (distance: number): string => {
    return Number(distance).toFixed(2);
  };


  const renderOrderCard = (order: Booking) => {
    const isProcessing = processingOrder === order.id;
    
    return (
      <Card key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Typography variant="body" style={styles.customerName}>
              {order.customerName}
            </Typography>
            <Typography variant="body" style={styles.orderId}>
              {order.customerPhone}
            </Typography>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Typography variant="caption" style={styles.statusText}>
              {getStatusText(order.status)}
            </Typography>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetail}>
              <Ionicons name="water-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.orderDetailText}>
              {order.tankerSize}L Tanker
            </Typography>
          </View>
          <View style={styles.orderDetail}>
            <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.orderDetailText}>
              {PricingUtils.formatPrice(order.totalPrice)}
            </Typography>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => {
            // TODO: Open Google Maps with the address
          }}
          activeOpacity={0.7}
          style={styles.addressContainer}
        >
          <Ionicons name="location" size={14} color={UI_CONFIG.colors.primary} />
          <Typography variant="caption" style={styles.orderAddress}>
            {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </Typography>
        </TouchableOpacity>

        <Typography variant="caption" style={styles.orderTime}>
          {order.isImmediate ? 'Immediate' : `Scheduled: ${formatDate(order.scheduledFor!)}`}
        </Typography>

        {order.status === 'delivered' && order.deliveredAt && (
          <View style={styles.deliveredInfo}>
            <Ionicons name="checkmark-circle" size={16} color={UI_CONFIG.colors.success} />
            <Typography variant="caption" style={styles.deliveredText}>
              Delivered: {formatDate(order.deliveredAt)}
            </Typography>
          </View>
        )}

        {/* Action Buttons */}
        {activeTab === 'available' && (
          <Button
            title="Accept Order"
            onPress={() => handleAcceptOrder(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.actionButton}
          />
        )}

        {activeTab === 'active' && order.status === 'accepted' && (
          <Button
            title="Start Delivery"
            onPress={() => handleStartDelivery(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.actionButton}
          />
        )}

        {activeTab === 'active' && order.status === 'in_transit' && (
          <Button
            title="Complete Delivery"
            onPress={() => handleCompleteDelivery(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={[styles.actionButton, styles.completeButton]}
          />
        )}
      </Card>
    );
  };

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Ionicons 
        name={activeTab === 'available' ? 'list-outline' : 'checkmark-circle-outline'} 
        size={48} 
        color={UI_CONFIG.colors.textSecondary} 
      />
      <Typography variant="body" style={styles.emptyText}>
        {activeTab === 'available' && 'No available orders'}
        {activeTab === 'active' && 'No active orders'}
        {activeTab === 'completed' && 'No completed orders'}
      </Typography>
      <Typography variant="caption" style={styles.emptySubtext}>
        {activeTab === 'available' && 'New orders will appear here when customers place them'}
        {activeTab === 'active' && 'Your active deliveries will appear here'}
        {activeTab === 'completed' && 'Your completed deliveries will appear here'}
      </Typography>
    </Card>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading orders...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Typography variant="h2" style={styles.title}>
              Welcome, {user?.name || 'Driver'}!
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Manage your orders and deliveries
            </Typography>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color={UI_CONFIG.colors.error} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <View style={styles.glassRadioGroup}>
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.glassRadioOption}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                onLayout={(e) => {
                  if (index === 0) {
                    const width = e.nativeEvent.layout.width;
                    if (tabOptionWidth !== width) {
                      setTabOptionWidth(width);
                    }
                  }
                }}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={20} 
                  color={UI_CONFIG.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Typography 
                  variant="body" 
                  style={[
                    styles.glassRadioLabel,
                    activeTab === tab.key && styles.glassRadioLabelActive
                  ]}
                >
                  {tab.label}
                </Typography>
              </TouchableOpacity>
            ))}
            {tabOptionWidth > 0 && (
              <Animated.View
                style={[
                  styles.glassGlider,
                  {
                    width: tabOptionWidth,
                    transform: [{
                      translateX: tabGliderAnim,
                    }],
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* Orders List */}
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.ordersContainer}>
            {getFilteredOrders().length > 0 ? (
              getFilteredOrders().map(renderOrderCard)
            ) : (
              renderEmptyState()
            )}
          </View>
        </ScrollView>
      </View>
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
    backgroundColor: UI_CONFIG.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContainer: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.background,
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
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    flexDirection: 'row',
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
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDetailText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  orderAddress: {
    fontSize: 12,
    color: UI_CONFIG.colors.primary,
    marginLeft: 6,
  },
  orderTime: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
  },
  deliveredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  deliveredText: {
    fontSize: 12,
    color: UI_CONFIG.colors.success,
    marginLeft: 6,
    fontWeight: '500',
  },
  actionButton: {
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OrdersScreen;
