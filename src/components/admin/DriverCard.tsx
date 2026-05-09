import React, { memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card } from '../common';
import { DriverUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { formatDateOnly } from '../../utils/dateUtils';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

export interface DriverCardProps {
  driver: DriverUser;
  onPress: () => void;
  onEdit: (driver: DriverUser) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onPress,
  onEdit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const formattedLicenseExpiry = useMemo(() => {
    return driver.licenseExpiry ? formatDateOnly(driver.licenseExpiry) : 'Expiry not provided';
  }, [driver.licenseExpiry]);

  const formattedEarnings = useMemo(() => {
    return PricingUtils.formatPrice(driver.totalEarnings || 0);
  }, [driver.totalEarnings]);

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
          <Ionicons name="pencil-outline" size={20} color={colors.success} />
        </TouchableOpacity>
      </View>

      <View style={styles.driverDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {driver.licenseNumber || 'Not provided'}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {formattedLicenseExpiry}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {emergencyContact}
          </Typography>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
          <Typography variant="caption" style={styles.detailText}>
            {formattedEarnings} earned
          </Typography>
        </View>
      </View>

    </TouchableOpacity>
  </Card>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
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
      borderColor: colors.success,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    driverInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 2,
    },
    driverPhone: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.textSecondary,
      marginLeft: UI_CONFIG.spacing.sm,
    },
  });
}

export default memo(DriverCard);
