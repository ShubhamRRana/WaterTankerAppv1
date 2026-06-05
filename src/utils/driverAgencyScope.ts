import { Booking } from '../types';

/** True when booking belongs to the driver's agency (booking.agencyId = admin who created the driver). */
export function bookingMatchesDriverAgency(
  booking: Booking,
  agencyId: string | undefined
): boolean {
  if (!agencyId) return false;
  return booking.agencyId === agencyId;
}

/** Filter bookings to those scoped to the driver's agency. */
export function bookingsForDriverAgency(
  bookings: Booking[],
  agencyId: string | undefined
): Booking[] {
  if (!agencyId) return [];
  return bookings.filter((b) => b.agencyId === agencyId);
}
