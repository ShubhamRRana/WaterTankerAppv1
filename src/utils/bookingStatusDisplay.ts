import type { BookingStatus } from '../types';
import type { AppPalette } from '../theme/palettes';

export function getBookingStatusColor(status: BookingStatus, colors: AppPalette): string {
  switch (status) {
    case 'pending': return colors.warning;
    case 'accepted': return colors.accent;
    case 'in_transit': return colors.secondary;
    case 'delivered': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textSecondary;
  }
}

export function getBookingStatusIcon(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'time-outline';
    case 'accepted': return 'checkmark-circle-outline';
    case 'in_transit': return 'car-outline';
    case 'delivered': return 'checkmark-done-outline';
    case 'cancelled': return 'close-circle-outline';
    default: return 'help-circle-outline';
  }
}

export function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'accepted': return 'Accepted';
    case 'in_transit': return 'In Transit';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return 'Unknown';
  }
}
