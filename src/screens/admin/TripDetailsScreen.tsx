import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAuthStore } from '../../store/authStore';
import { Typography, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { UI_CONFIG } from '../../constants/config';
import { SocietyTrip, SocietyTripService } from '../../services/societyTrip.service';
import { formatDateTime } from '../../utils/dateUtils';

type TripDetailsNavigationProp = StackNavigationProp<AdminStackParamList, 'TripDetails'>;

interface Props {
  navigation: TripDetailsNavigationProp;
}

const TripDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

  const canLoad = user?.role === 'admin' && !!user.id;

  const loadTrips = useCallback(async () => {
    if (!canLoad) return;
    const list = await SocietyTripService.listTripsForAdmin(user.id);
    setTrips(list);
  }, [canLoad, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadTrips()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [loadTrips]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTrips();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, [loadTrips]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }, [logout]);

  const handleMenuNavigate = useCallback(
    (route: AdminRoute) => {
      if (route === 'TripDetails') return;
      navigation.navigate(route as any);
    },
    [navigation],
  );

  const subtitle = useMemo(() => {
    if (!canLoad) return 'Sign in as an admin to view trips';
    return `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} linked to your agency`;
  }, [canLoad, trips.length]);

  if (isLoading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading trip details…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              Trip details
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {subtitle}
            </Typography>
          </View>
        </View>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={trips.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI_CONFIG.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyTitle}>
                No trips found
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                Trips will appear here once society users log trips for your agency.
              </Typography>
            </View>
          }
          renderItem={({ item }) => {
            const firstPhoto = item.photoUrls[0];
            return (
              <View style={styles.tripCard}>
                <View style={styles.tripRow}>
                  <TouchableOpacity
                    style={styles.thumbCell}
                    activeOpacity={0.85}
                    disabled={!firstPhoto}
                    onPress={() => firstPhoto && setPhotoPreviewUri(firstPhoto)}
                  >
                    {firstPhoto ? (
                      <Image source={{ uri: firstPhoto }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]} />
                    )}
                    {firstPhoto ? (
                      <View style={styles.thumbHint}>
                        <Ionicons name="expand-outline" size={14} color={UI_CONFIG.colors.textLight} />
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.tripInfo}>
                    <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                      {item.agencyName}
                    </Typography>
                    <Typography variant="caption" style={styles.meta}>
                      {formatDateTime(item.scheduledAt)}
                    </Typography>
                    <Typography variant="caption" style={styles.meta}>
                      {item.tankerSizeLiters}L tanker
                    </Typography>
                    {item.tankerAmount != null ? (
                      <Typography variant="caption" style={styles.meta}>
                        Amount: ₹{item.tankerAmount.toLocaleString()}
                      </Typography>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
      />

      <Modal
        visible={photoPreviewUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewUri(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.photoModalRoot} onPress={() => setPhotoPreviewUri(null)}>
          {photoPreviewUri ? (
            <View pointerEvents="none" style={styles.photoModalImage}>
              <Image
                source={{ uri: photoPreviewUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.photoModalClose, { top: insets.top + 8 }]}
            onPress={() => setPhotoPreviewUri(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={28} color={UI_CONFIG.colors.textLight} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
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
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: UI_CONFIG.colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    paddingHorizontal: 16,
  },
  tripCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbCell: {
    position: 'relative',
    marginRight: 14,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  thumbEmpty: {
    opacity: 0.35,
  },
  thumbHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 2,
  },
  tripInfo: {
    flex: 1,
    minWidth: 0,
  },
  agencyName: {
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 6,
  },
  meta: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  photoModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    right: 20,
    zIndex: 2,
    padding: 4,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
});

export default TripDetailsScreen;

