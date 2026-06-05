/**
 * Driver Agency Scope Tests
 */

import { Booking } from '../../types';
import { bookingMatchesDriverAgency, bookingsForDriverAgency } from '../../utils/driverAgencyScope';

const baseBooking: Booking = {
  id: 'booking-1',
  customerId: 'customer-1',
  customerName: 'Test Customer',
  customerPhone: '1234567890',
  status: 'pending',
  tankerSize: 1000,
  basePrice: 500,
  distanceCharge: 100,
  totalPrice: 600,
  deliveryAddress: {
    street: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    latitude: 0,
    longitude: 0,
  },
  distance: 10,
  paymentStatus: 'pending',
  canCancel: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('driverAgencyScope', () => {
  describe('bookingMatchesDriverAgency', () => {
    it('returns true when booking agency matches driver agency', () => {
      const booking = { ...baseBooking, agencyId: 'admin-1' };
      expect(bookingMatchesDriverAgency(booking, 'admin-1')).toBe(true);
    });

    it('returns false when booking agency does not match', () => {
      const booking = { ...baseBooking, agencyId: 'admin-2' };
      expect(bookingMatchesDriverAgency(booking, 'admin-1')).toBe(false);
    });

    it('returns false when agencyId is undefined', () => {
      const booking = { ...baseBooking, agencyId: 'admin-1' };
      expect(bookingMatchesDriverAgency(booking, undefined)).toBe(false);
    });

    it('returns false when booking has no agencyId', () => {
      expect(bookingMatchesDriverAgency(baseBooking, 'admin-1')).toBe(false);
    });
  });

  describe('bookingsForDriverAgency', () => {
    it('filters bookings to matching agency only', () => {
      const bookings = [
        { ...baseBooking, id: 'b1', agencyId: 'admin-1' },
        { ...baseBooking, id: 'b2', agencyId: 'admin-2' },
        { ...baseBooking, id: 'b3', agencyId: 'admin-1' },
      ];

      const result = bookingsForDriverAgency(bookings, 'admin-1');

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(['b1', 'b3']);
    });

    it('returns empty array when agencyId is undefined', () => {
      const bookings = [{ ...baseBooking, agencyId: 'admin-1' }];
      expect(bookingsForDriverAgency(bookings, undefined)).toEqual([]);
    });
  });
});
