import React, { memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card } from '../common';
import { Booking, BookingStatus } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';

export interface BookingCardProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
  getStatusColor: (status: BookingStatus) => string;
  getStatusIcon: (status: BookingStatus) => string;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  getStatusColor,
  getStatusIcon,
}) => {
  const statusColor = useMemo(() => getStatusColor(booking.status), [booking.status, getStatusColor]);
  const statusIcon = useMemo(() => getStatusIcon(booking.status), [booking.status, getStatusIcon]);
  const formattedDate = useMemo(() => {
    return new Date(booking.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [booking.createdAt]);
  const formattedDeliveredDate = useMemo(() => {
    if (!booking.deliveredAt) return null;
    return new Date(booking.deliveredAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [booking.deliveredAt]);
  const bookingIdShort = useMemo(() => booking.id.slice(-8), [booking.id]);
  const statusText = useMemo(() => booking.status.replace('_', ' ').toUpperCase(), [booking.status]);

  return (
  <Card style={styles.bookingCard}>
    <TouchableOpacity 
      onPress={() => onPress(booking)}
      activeOpacity={0.7}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Typography variant="h3" style={styles.customerName}>
            {booking.customerName}
          </Typography>
          <Typography variant="caption" style={styles.bookingId}>
            #{bookingIdShort}
          </Typography>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons 
            name={statusIcon as any} 
            size={16} 
            color={UI_CONFIG.colors.textLight} 
          />
          <Typography variant="caption" style={styles.statusText}>
            {statusText}
          </Typography>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="water-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {booking.tankerSize}L Tanker
          </Typography>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {booking.deliveryAddress.street}
          </Typography>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {PricingUtils.formatPrice(booking.totalPrice)}
          </Typography>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
          <Typography variant="body" style={styles.detailText}>
            {formattedDate}
          </Typography>
        </View>
        {booking.status === 'delivered' && formattedDeliveredDate && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={16} color={UI_CONFIG.colors.success} />
            <Typography variant="body" style={styles.detailText}>
              Delivered: {formattedDeliveredDate}
            </Typography>
          </View>
        )}
      </View>

      {booking.driverName && (
        <View style={styles.driverInfo}>
          <Typography variant="caption" style={styles.driverLabel}>
            Driver: {booking.driverName}
          </Typography>
        </View>
      )}
    </TouchableOpacity>
  </Card>
  );
};

export default memo(BookingCard);

const styles = StyleSheet.create({
  bookingCard: {
    marginBottom: UI_CONFIG.spacing.md,
    padding: UI_CONFIG.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: UI_CONFIG.spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
    marginLeft: 4,
  },
  bookingDetails: {
    marginBottom: UI_CONFIG.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    marginLeft: UI_CONFIG.spacing.sm,
  },
  driverInfo: {
    paddingTop: UI_CONFIG.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.background,
  },
  driverLabel: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
});

