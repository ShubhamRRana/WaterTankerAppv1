import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  RefreshControl,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { Typography, Card, Button, LoadingSpinner } from '../../components/common';
import { User } from '../../types';
import { UI_CONFIG } from '../../constants/config';

const DriverManagementScreen: React.FC = () => {
  const { users, fetchAllUsers, updateUser, isLoading } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const drivers = users.filter(user => user.role === 'driver');

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      await fetchAllUsers();
    } catch (error) {
      console.error('Failed to load drivers:', error);
      Alert.alert('Error', 'Failed to load drivers. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    setRefreshing(false);
  };

  const handleApproveDriver = async (driverId: string) => {
    Alert.alert(
      'Approve Driver',
      'Are you sure you want to approve this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await updateUser(driverId, { isApproved: true });
              Alert.alert('Success', 'Driver approved successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve driver');
            }
          },
        },
      ]
    );
  };

  const handleRejectDriver = async (driverId: string) => {
    Alert.alert(
      'Reject Driver',
      'Are you sure you want to reject this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUser(driverId, { isApproved: false });
              Alert.alert('Success', 'Driver rejected successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject driver');
            }
          },
        },
      ]
    );
  };

  const toggleDriverAvailability = async (driverId: string, currentStatus: boolean) => {
    try {
      await updateUser(driverId, { isAvailable: !currentStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update driver availability');
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         driver.phone.includes(searchQuery) ||
                         driver.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'approved' && driver.isApproved) ||
                         (filterStatus === 'pending' && driver.isApproved === undefined) ||
                         (filterStatus === 'rejected' && driver.isApproved === false);
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (driver: User) => {
    if (driver.isApproved === true) return '#34C759';
    if (driver.isApproved === false) return '#FF3B30';
    return '#FF9500';
  };

  const getStatusText = (driver: User) => {
    if (driver.isApproved === true) return 'Approved';
    if (driver.isApproved === false) return 'Rejected';
    return 'Pending';
  };

  const DriverCard: React.FC<{ driver: User }> = ({ driver }) => (
    <Card style={styles.driverCard}>
      <TouchableOpacity 
        style={styles.driverCardContent}
        onPress={() => {
          setSelectedDriver(driver);
          setShowDriverModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <Typography variant="h3" style={styles.driverName}>
              {driver.name}
            </Typography>
            <Typography variant="body" style={styles.driverPhone}>
              {driver.phone}
            </Typography>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver) }]}>
            <Typography variant="caption" style={styles.statusText}>
              {getStatusText(driver)}
            </Typography>
          </View>
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              {driver.vehicleNumber || 'Not provided'}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              {driver.licenseNumber || 'Not provided'}
            </Typography>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#8E8E93" />
            <Typography variant="caption" style={styles.detailText}>
              ₹{driver.totalEarnings || 0} earned
            </Typography>
          </View>
        </View>

        <View style={styles.driverActions}>
          <View style={styles.availabilityToggle}>
            <Typography variant="caption" style={styles.availabilityLabel}>
              Available
            </Typography>
            <Switch
              value={driver.isAvailable || false}
              onValueChange={() => toggleDriverAvailability(driver.uid, driver.isAvailable || false)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor={driver.isAvailable ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          {driver.isApproved === undefined && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApproveDriver(driver.uid)}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Typography variant="caption" style={styles.actionButtonText}>
                  Approve
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectDriver(driver.uid)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
                <Typography variant="caption" style={styles.actionButtonText}>
                  Reject
                </Typography>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

  const DriverModal: React.FC = () => (
    <Modal
      visible={showDriverModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Typography variant="h2" style={styles.modalTitle}>
            Driver Details
          </Typography>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDriverModal(false)}
          >
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {selectedDriver && (
          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Personal Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Name</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedDriver.name}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Phone</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedDriver.phone}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Email</Typography>
                <Typography variant="body" style={styles.detailValue}>{selectedDriver.email || 'Not provided'}</Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Joined</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {new Date(selectedDriver.createdAt).toLocaleDateString()}
                </Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Vehicle Information
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Vehicle Number</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedDriver.vehicleNumber || 'Not provided'}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>License Number</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedDriver.licenseNumber || 'Not provided'}
                </Typography>
              </View>
            </Card>

            <Card style={styles.detailCard}>
              <Typography variant="h3" style={styles.detailSectionTitle}>
                Performance
              </Typography>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Total Earnings</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  ₹{selectedDriver.totalEarnings || 0}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Completed Orders</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedDriver.completedOrders || 0}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Status</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {getStatusText(selectedDriver)}
                </Typography>
              </View>
              <View style={styles.detailItem}>
                <Typography variant="body" style={styles.detailLabel}>Available</Typography>
                <Typography variant="body" style={styles.detailValue}>
                  {selectedDriver.isAvailable ? 'Yes' : 'No'}
                </Typography>
              </View>
            </Card>

            {selectedDriver.isApproved === undefined && (
              <View style={styles.modalActions}>
                <Button
                  title="Approve Driver"
                  onPress={() => {
                    setShowDriverModal(false);
                    handleApproveDriver(selectedDriver.uid);
                  }}
                  style={styles.approveButtonLarge}
                />
                <Button
                  title="Reject Driver"
                  onPress={() => {
                    setShowDriverModal(false);
                    handleRejectDriver(selectedDriver.uid);
                  }}
                  style={styles.rejectButtonLarge}
                />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const stats = {
    total: drivers.length,
    approved: drivers.filter(d => d.isApproved === true).length,
    pending: drivers.filter(d => d.isApproved === undefined).length,
    active: drivers.filter(d => d.isAvailable).length,
  };

  if (isLoading && drivers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading drivers...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

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
            Driver Management
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Manage driver accounts and approvals
          </Typography>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.total}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Total Drivers</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.approved}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Approved</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.pending}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Pending</Typography>
            </Card>
            <Card style={styles.statCard}>
              <Typography variant="h3" style={styles.statValue}>{stats.active}</Typography>
              <Typography variant="caption" style={styles.statLabel}>Active</Typography>
            </Card>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search drivers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Typography 
                  variant="caption" 
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Drivers List */}
        <View style={styles.driversSection}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Drivers ({filteredDrivers.length})
          </Typography>
          
          {filteredDrivers.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#8E8E93" />
              <Typography variant="body" style={styles.emptyText}>
                {searchQuery || filterStatus !== 'all' 
                  ? 'No drivers found matching your criteria'
                  : 'No drivers registered yet'
                }
              </Typography>
            </Card>
          ) : (
            filteredDrivers.map((driver) => (
              <DriverCard key={driver.uid} driver={driver} />
            ))
          )}
        </View>
      </ScrollView>

      <DriverModal />
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
    marginTop: UI_CONFIG.spacing.md,
    color: UI_CONFIG.colors.textSecondary,
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
  statsSection: {
    padding: UI_CONFIG.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: UI_CONFIG.spacing.md,
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    marginBottom: UI_CONFIG.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: UI_CONFIG.spacing.sm,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
  },
  filterScroll: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: UI_CONFIG.spacing.md,
    paddingVertical: UI_CONFIG.spacing.sm,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    marginRight: UI_CONFIG.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  driversSection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  driverCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  driverCardContent: {
    padding: UI_CONFIG.spacing.md,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  driverDetails: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    marginRight: UI_CONFIG.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: UI_CONFIG.spacing.xs,
    borderRadius: 6,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: UI_CONFIG.spacing.md,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  closeButton: {
    padding: UI_CONFIG.spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: UI_CONFIG.spacing.lg,
  },
  detailCard: {
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: UI_CONFIG.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailLabel: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: UI_CONFIG.spacing.md,
  },
  modalActions: {
    marginTop: UI_CONFIG.spacing.lg,
  },
  approveButtonLarge: {
    backgroundColor: '#34C759',
    marginBottom: UI_CONFIG.spacing.md,
  },
  rejectButtonLarge: {
    backgroundColor: '#FF3B30',
  },
});

export default DriverManagementScreen;
