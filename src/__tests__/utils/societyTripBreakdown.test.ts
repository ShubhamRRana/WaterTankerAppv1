/**
 * Society Trip Breakdown Tests
 */

import {
  buildTankerSizeBreakdown,
  computeBreakdownTotals,
  filterTripsByPeriod,
  isTripPending,
} from '../../utils/societyTripBreakdown';
import { SocietyTrip } from '../../services/societyTrip.service';

const createTrip = (
  id: string,
  overrides: Partial<SocietyTrip> = {},
): SocietyTrip => ({
  id,
  customerId: 'customer-1',
  agencyName: 'Test Agency',
  agencyAdminId: 'admin-1',
  scheduledAt: new Date('2026-05-10T10:00:00Z'),
  tankerSizeLiters: 10000,
  tankerAmount: 1000,
  photoUrls: [],
  createdAt: new Date('2026-05-10T10:00:00Z'),
  ...overrides,
});

describe('filterTripsByPeriod', () => {
  const trips = [
    createTrip('a', { scheduledAt: new Date(2026, 4, 5) }), // May
    createTrip('b', { scheduledAt: new Date(2026, 5, 5) }), // June
    createTrip('c', { scheduledAt: new Date(2025, 4, 5) }), // May previous year
  ];

  it('filters to the selected month', () => {
    const result = filterTripsByPeriod(trips, 'month', 2026, 4);
    expect(result.map((t) => t.id)).toEqual(['a']);
  });

  it('filters to the selected year', () => {
    const result = filterTripsByPeriod(trips, 'year', 2026, 4);
    expect(result.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });
});

describe('isTripPending', () => {
  const trip = createTrip('a', { createdAt: new Date('2026-05-10T10:00:00Z') });

  it('is pending when never settled', () => {
    expect(isTripPending(trip, undefined)).toBe(true);
  });

  it('is not pending when created on or before settlement', () => {
    expect(isTripPending(trip, new Date('2026-05-10T10:00:00Z'))).toBe(false);
    expect(isTripPending(trip, new Date('2026-05-11T10:00:00Z'))).toBe(false);
  });

  it('is pending when created after settlement', () => {
    expect(isTripPending(trip, new Date('2026-05-09T10:00:00Z'))).toBe(true);
  });
});

describe('computeBreakdownTotals', () => {
  it('treats all amounts as pending when never settled', () => {
    const trips = [
      createTrip('a', { tankerAmount: 1000 }),
      createTrip('b', { tankerAmount: 1500 }),
    ];
    const totals = computeBreakdownTotals(trips, undefined);
    expect(totals.amountSum).toBe(2500);
    expect(totals.pendingAmountSum).toBe(2500);
    expect(totals.pendingCount).toBe(2);
  });

  it('has no pending when all trips precede settlement', () => {
    const completedAt = new Date('2026-05-20T00:00:00Z');
    const trips = [
      createTrip('a', { createdAt: new Date('2026-05-10T00:00:00Z'), tankerAmount: 1000 }),
      createTrip('b', { createdAt: new Date('2026-05-15T00:00:00Z'), tankerAmount: 1500 }),
    ];
    const totals = computeBreakdownTotals(trips, completedAt);
    expect(totals.amountSum).toBe(2500);
    expect(totals.pendingAmountSum).toBe(0);
    expect(totals.pendingCount).toBe(0);
  });

  it('counts only post-settlement trips as pending', () => {
    const completedAt = new Date('2026-05-20T00:00:00Z');
    const trips = [
      createTrip('a', { createdAt: new Date('2026-05-10T00:00:00Z'), tankerAmount: 1000 }),
      createTrip('b', { createdAt: new Date('2026-05-25T00:00:00Z'), tankerAmount: 1500 }),
    ];
    const totals = computeBreakdownTotals(trips, completedAt);
    expect(totals.amountSum).toBe(2500);
    expect(totals.pendingAmountSum).toBe(1500);
    expect(totals.pendingCount).toBe(1);
  });

  it('ignores trips without a valid amount in amount sums', () => {
    const trips = [
      createTrip('a', { tankerAmount: 1000 }),
      createTrip('b', { tankerAmount: null }),
    ];
    const totals = computeBreakdownTotals(trips, undefined);
    expect(totals.tripCount).toBe(2);
    expect(totals.tripsWithAmount).toBe(1);
    expect(totals.amountSum).toBe(1000);
    expect(totals.pendingAmountSum).toBe(1000);
  });
});

describe('buildTankerSizeBreakdown', () => {
  it('always includes the standard tanker sizes with zeros', () => {
    const rows = buildTankerSizeBreakdown([], undefined);
    expect(rows.map((r) => r.liters)).toEqual([10000, 15000]);
    expect(rows.every((r) => r.count === 0 && r.amountSum === 0)).toBe(true);
  });

  it('aggregates counts and amounts per size', () => {
    const trips = [
      createTrip('a', { tankerSizeLiters: 10000, tankerAmount: 1000 }),
      createTrip('b', { tankerSizeLiters: 10000, tankerAmount: 1200 }),
      createTrip('c', { tankerSizeLiters: 15000, tankerAmount: 1800 }),
    ];
    const rows = buildTankerSizeBreakdown(trips, undefined);
    const tenK = rows.find((r) => r.liters === 10000)!;
    const fifteenK = rows.find((r) => r.liters === 15000)!;
    expect(tenK.count).toBe(2);
    expect(tenK.amountSum).toBe(2200);
    expect(fifteenK.count).toBe(1);
    expect(fifteenK.amountSum).toBe(1800);
  });

  it('isolates the pending amount per size after settlement', () => {
    const completedAt = new Date('2026-05-20T00:00:00Z');
    const trips = [
      createTrip('a', {
        tankerSizeLiters: 10000,
        tankerAmount: 1000,
        createdAt: new Date('2026-05-10T00:00:00Z'),
      }),
      createTrip('b', {
        tankerSizeLiters: 10000,
        tankerAmount: 1200,
        createdAt: new Date('2026-05-25T00:00:00Z'),
      }),
    ];
    const rows = buildTankerSizeBreakdown(trips, completedAt);
    const tenK = rows.find((r) => r.liters === 10000)!;
    expect(tenK.amountSum).toBe(2200);
    expect(tenK.pendingAmountSum).toBe(1200);
    expect(tenK.pendingCount).toBe(1);
    expect(tenK.pendingTripsWithAmount).toBe(1);
  });
});
