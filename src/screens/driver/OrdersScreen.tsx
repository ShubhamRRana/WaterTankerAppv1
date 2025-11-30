import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { Typography, LoadingSpinner } from '../../components/common';
import { Booking } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { DriverStackParamList, DriverTabParamList } from '../../navigation/DriverNavigator';
import OrdersHeader from '../../components/driver/OrdersHeader';
import OrdersFilter, { OrderTab } from '../../components/driver/OrdersFilter';
import OrdersList from '../../components/driver/OrdersList';

type OrdersScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'Orders'>,
  StackNavigationProp<DriverStackParamList>
>;

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<OrdersScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const { bookings, isLoading, error, fetchAvailableBookings, fetchDriverBookings, updateBookingStatus, clearError } = useBookingStore();
  
  const [activeTab, setActiveTab] = useState<OrderTab>('available');
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const previousTabRef = useRef<OrderTab>('available');
  const tabChangeTimeRef = useRef<number>(0);
  
  // Cache for storing fetched data per tab to avoid unnecessary refetches
  const dataCache = useRef<{
    available: { data: Booking[]; timestamp: number } | null;
    active: { data: Booking[]; timestamp: number } | null;
    completed: { data: Booking[]; timestamp: number } | null;
  }>({
    available: null,
    active: null,
    completed: null,
  });
  
  // Abort controller for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  const loadOrdersData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Check cache first (unless force refresh)
    const cacheKey = activeTab as 'available' | 'active' | 'completed';
    const cached = dataCache.current[cacheKey];
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_EXPIRY) {
      // Use cached data
      return;
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      setLocalError(null);
      clearError();
      
      if (activeTab === 'available') {
        await fetchAvailableBookings();
      } else {
        await fetchDriverBookings(user.id);
      }
      
      // Cache will be updated from the store's bookings via useEffect after fetch completes
    } catch (error: any) {
      // Don't set error if request was aborted
      if (signal.aborted) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load orders';
      setLocalError(errorMessage);
          }
  }, [activeTab, user?.id, fetchAvailableBookings, fetchDriverBookings, clearError]);

  // Load data when tab changes (only once, not on focus)
  useEffect(() => {
    // Track tab change time to distinguish from navigation returns
    const previousTab = previousTabRef.current;
    const isTabChange = previousTab !== activeTab;
    
    if (isTabChange) {
      tabChangeTimeRef.current = Date.now();
    }
    
    // Update previous tab after checking
    previousTabRef.current = activeTab;
    
    setIsInitialLoading(true);
    loadOrdersData().finally(() => {
      setIsInitialLoading(false);
    });
  }, [activeTab, user?.id]); // Only depend on activeTab and user, not loadOrdersData

  // Update cache when bookings change (after fetch completes)
  useEffect(() => {
    if (!isLoading) {
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      // Only update cache if we have bookings or if it's a valid empty state
      // This ensures cache is updated even when there are no orders
      dataCache.current[cacheKey] = {
        data: [...bookings],
        timestamp: Date.now(),
      };
    }
  }, [bookings, activeTab, isLoading]);

  // Reload orders when screen comes into focus (with cache check)
  useFocusEffect(
    React.useCallback(() => {
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      const cached = dataCache.current[cacheKey];
      const now = Date.now();
      
      // Check if we just switched tabs (within last 500ms) - if so, skip refresh
      // The useEffect above already handles tab switching
      const timeSinceTabChange = now - tabChangeTimeRef.current;
      const isTabSwitch = timeSinceTabChange < 500;
      
      if (isTabSwitch) {
        // Tab was just switched, useEffect already handled the data load
        return;
      }
      
      // We're returning from navigation (like CollectPaymentScreen)
      // Refresh active tab to ensure status changes are reflected
      // This fixes the issue where "Collect Payment" button appears twice after returning from CollectPaymentScreen
      if (activeTab === 'active') {
        // Invalidate cache and refresh for active tab to ensure status changes are reflected
        dataCache.current.active = null;
        loadOrdersData(true);
      } else if (!cached || (now - cached.timestamp) >= CACHE_EXPIRY) {
        // For other tabs, use normal cache expiry logic
        loadOrdersData(true);
      }
    }, [activeTab, user?.id, loadOrdersData])
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setLocalError(null);
    clearError();
    // Invalidate cache for current tab
    const cacheKey = activeTab as 'available' | 'active' | 'completed';
    dataCache.current[cacheKey] = null;
    await loadOrdersData(true);
    setRefreshing(false);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user?.id) return;
    
    setProcessingOrder(orderId);
    
    // Optimistic update: Update local bookings immediately
    const currentBooking = bookings.find(b => b.id === orderId);
    if (currentBooking) {
      const optimisticBooking: Booking = {
        ...currentBooking,
        status: 'accepted',
        driverId: user.id,
        driverName: user.name,
        driverPhone: user.phone || '',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Update cache optimistically
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      if (dataCache.current[cacheKey]) {
        dataCache.current[cacheKey] = {
          data: dataCache.current[cacheKey]!.data.map(b => 
            b.id === orderId ? optimisticBooking : b
          ),
          timestamp: Date.now(),
        };
      }
    }
    
    try {
      await updateBookingStatus(orderId, 'accepted', {
        driverId: user.id,
        driverName: user.name,
        driverPhone: user.phone || '',
        acceptedAt: new Date(),
      });
      
      // Invalidate caches since order moved from available to active
      dataCache.current.available = null;
      dataCache.current.active = null;
      
      // Switch to active tab to show the accepted order
      setActiveTab('active');
      
      // Fetch fresh data for active tab
      await loadOrdersData(true);
      
      Alert.alert('Success', 'Order accepted successfully! Check the Active tab.');
    } catch (error) {
      // Revert optimistic update on error
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      if (dataCache.current[cacheKey]) {
        dataCache.current[cacheKey] = null;
      }
      await loadOrdersData(true);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept order';
      setLocalError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    setProcessingOrder(orderId);
    
    // Optimistic update
    const currentBooking = bookings.find(b => b.id === orderId);
    if (currentBooking) {
      const optimisticBooking: Booking = {
        ...currentBooking,
        status: 'in_transit',
        updatedAt: new Date(),
      };
      
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      if (dataCache.current[cacheKey]) {
        dataCache.current[cacheKey] = {
          data: dataCache.current[cacheKey]!.data.map(b => 
            b.id === orderId ? optimisticBooking : b
          ),
          timestamp: Date.now(),
        };
      }
    }
    
    try {
      await updateBookingStatus(orderId, 'in_transit');
      
      // Invalidate cache
      dataCache.current.active = null;
      await loadOrdersData(true);
      
      Alert.alert('Success', 'Delivery started!');
    } catch (error) {
      // Revert optimistic update
      const cacheKey = activeTab as 'available' | 'active' | 'completed';
      if (dataCache.current[cacheKey]) {
        dataCache.current[cacheKey] = null;
      }
      await loadOrdersData(true);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to start delivery';
      setLocalError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleCollectPayment = (orderId: string) => {
    try {
      navigation.navigate('CollectPayment', { orderId });
    } catch (error) {
            Alert.alert('Error', 'Failed to open payment screen. Please try again.');
    }
  };

  const filteredOrders = useMemo((): Booking[] => {
    if (!user?.id) return [];

    // Use cached data if available and fresh, otherwise use store data
    const cacheKey = activeTab as 'available' | 'active' | 'completed';
    const cached = dataCache.current[cacheKey];
    const now = Date.now();
    const dataSource = (cached && (now - cached.timestamp) < CACHE_EXPIRY) 
      ? cached.data 
      : bookings;

    switch (activeTab) {
      case 'available':
        return dataSource.filter(booking => 
          booking.status === 'pending' && !booking.driverId
        );
      case 'active':
        return dataSource.filter(booking => 
          booking.driverId === user.id && 
          (booking.status === 'accepted' || booking.status === 'in_transit')
        );
      case 'completed':
        return dataSource.filter(booking => 
          booking.driverId === user.id && booking.status === 'delivered'
        );
      default:
        return [];
    }
  }, [bookings, activeTab, user?.id]);

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
                            Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Show loading only on initial load, not during refresh
  if (isInitialLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>Loading orders...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  // Determine error message (prioritize local error, then store error)
  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <OrdersHeader 
          userName={user?.name} 
          onLogout={handleLogout} 
        />
        
        <OrdersFilter 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        <OrdersList
          orders={filteredOrders}
          activeTab={activeTab}
          refreshing={refreshing}
          processingOrder={processingOrder}
          error={displayError}
          onRefresh={onRefresh}
          onAcceptOrder={handleAcceptOrder}
          onStartDelivery={handleStartDelivery}
          onCollectPayment={handleCollectPayment}
          onDismissError={() => {
            setLocalError(null);
            clearError();
          }}
        />
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
});

export default OrdersScreen;

