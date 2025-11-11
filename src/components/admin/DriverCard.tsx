import React, { memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card } from '../common';
import { User } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

export interface DriverCardProps {
  driver: User;
  onPress: () => void;
  onEdit: (driver: User) => void;
  onApprove?: (driverId: string) => void;
  onReject?: (driverId: string) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onPress,
  onEdit,
  onApprove,
  onReject,
}) => {
  const formattedLicenseExpiry = useMemo(() => {
    return driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : 'Expiry not provided';
  }, [driver.licenseExpiry]);
  
  const formattedEarnings = useMemo(() => {
    return PricingUtils.formatPrice((driver as any).totalEarnings || 0);
  }, [(driver as any).totalEarnings]);

  const emergencyContact = useMemo(() => {
    return driver.emergencyContactName ? `${driver.emergencyContactName} - ${driver.emergencyContactPhone}` : 'Emergency contact not provided';
  }, [driver.emergencyContactName, driver.emergencyContactPhone]);

  return (
  <Card style={styles.driverCard}>
    <TouchableOpacity 
      style={styles.driverCardContent}
      onPress={onPress}
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
        <TouchableOpacity
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation();
            onEdit(driver);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={20} color={UI_CONFIG.colors.success} />
        </TouchableOpacity>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {driver.licenseNumber || 'Not provided'}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {formattedLicenseExpiry}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {emergencyContact}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {formattedEarnings} earned
          </Typography>
        </View>
      </View>

      <View style={styles.driverActions}>
        {driver.isApproved === undefined && onApprove && onReject && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => onApprove(driver.uid)}
            >
              <Ionicons name="checkmark" size={16} color={UI_CONFIG.colors.textLight} />
              <Typography variant="caption" style={styles.actionButtonText}>
                Approve
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => onReject(driver.uid)}
            >
              <Ionicons name="close" size={16} color={UI_CONFIG.colors.textLight} />
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
};

export default memo(DriverCard);

const styles = StyleSheet.create({
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
  editButton: {
    padding: 8,
    borderWidth: 1.5,
    borderColor: UI_CONFIG.colors.success,
    borderRadius: 8,
    backgroundColor: 'transparent',
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
    backgroundColor: UI_CONFIG.colors.success,
  },
  rejectButton: {
    backgroundColor: UI_CONFIG.colors.error,
  },
  actionButtonText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
    marginLeft: 4,
  },
});

