import { SocietyTrip } from '../services/societyTrip.service';

/** Standard society trip tanker sizes — always listed in the breakdown (with 0 when none). */
export const SOCIETY_TANKER_SIZE_LITERS = [10000, 15000] as const;

export interface TankerSizeBreakdownRow {
  liters: number;
  count: number;
  amountSum: number;
  tripsWithAmount: number;
  pendingCount: number;
  pendingAmountSum: number;
  pendingTripsWithAmount: number;
}

export interface BreakdownTotals {
  tripCount: number;
  amountSum: number;
  tripsWithAmount: number;
  pendingCount: number;
  pendingAmountSum: number;
  pendingTripsWithAmount: number;
}

export function normalizeTankerSizeLiters(value: unknown): number | null {
  const liters = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(liters) && liters > 0 ? liters : null;
}

export function filterTripsByPeriod(
  list: SocietyTrip[],
  periodType: 'month' | 'year',
  year: number,
  month: number,
): SocietyTrip[] {
  if (periodType === 'year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return list.filter((t) => {
      const d = new Date(t.scheduledAt);
      return d >= start && d <= end;
    });
  }
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return list.filter((t) => {
    const d = new Date(t.scheduledAt);
    return d >= monthStart && d <= monthEnd;
  });
}

/**
 * A trip is pending when payment was never settled for the period, or when it was
 * created after the society user settled (mirrors the inverse of `paymentSettledByCustomerId`).
 */
export function isTripPending(trip: SocietyTrip, completedAt: Date | undefined): boolean {
  if (!completedAt) return true;
  return trip.createdAt.getTime() > completedAt.getTime();
}

function hasAmount(trip: SocietyTrip): boolean {
  return trip.tankerAmount != null && Number.isFinite(trip.tankerAmount);
}

/**
 * Buckets trips by tanker size and computes per-size totals plus the pending portion.
 * Standard sizes are always present (with zeros) even when no trips match.
 */
export function buildTankerSizeBreakdown(
  trips: SocietyTrip[],
  completedAt: Date | undefined,
): TankerSizeBreakdownRow[] {
  const bucket = new Map<number, Omit<TankerSizeBreakdownRow, 'liters'>>();
  for (const t of trips) {
    const liters = normalizeTankerSizeLiters(t.tankerSizeLiters);
    if (liters == null) continue;
    const prev =
      bucket.get(liters) ??
      {
        count: 0,
        amountSum: 0,
        tripsWithAmount: 0,
        pendingCount: 0,
        pendingAmountSum: 0,
        pendingTripsWithAmount: 0,
      };
    prev.count += 1;
    const pending = isTripPending(t, completedAt);
    if (pending) prev.pendingCount += 1;
    if (hasAmount(t)) {
      prev.amountSum += t.tankerAmount as number;
      prev.tripsWithAmount += 1;
      if (pending) {
        prev.pendingAmountSum += t.tankerAmount as number;
        prev.pendingTripsWithAmount += 1;
      }
    }
    bucket.set(liters, prev);
  }
  const allLiters = [...new Set([...SOCIETY_TANKER_SIZE_LITERS, ...bucket.keys()])].sort((a, b) => a - b);
  return allLiters.map((liters) => {
    const b = bucket.get(liters);
    return {
      liters,
      count: b?.count ?? 0,
      amountSum: b?.amountSum ?? 0,
      tripsWithAmount: b?.tripsWithAmount ?? 0,
      pendingCount: b?.pendingCount ?? 0,
      pendingAmountSum: b?.pendingAmountSum ?? 0,
      pendingTripsWithAmount: b?.pendingTripsWithAmount ?? 0,
    };
  });
}

export function computeBreakdownTotals(
  trips: SocietyTrip[],
  completedAt: Date | undefined,
): BreakdownTotals {
  const totals: BreakdownTotals = {
    tripCount: trips.length,
    amountSum: 0,
    tripsWithAmount: 0,
    pendingCount: 0,
    pendingAmountSum: 0,
    pendingTripsWithAmount: 0,
  };
  for (const t of trips) {
    const pending = isTripPending(t, completedAt);
    if (pending) totals.pendingCount += 1;
    if (hasAmount(t)) {
      totals.amountSum += t.tankerAmount as number;
      totals.tripsWithAmount += 1;
      if (pending) {
        totals.pendingAmountSum += t.tankerAmount as number;
        totals.pendingTripsWithAmount += 1;
      }
    }
  }
  return totals;
}
