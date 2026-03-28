import { supabase } from '../lib/supabaseClient';
import { SocietyTrip, type Address } from '../types';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

/** Short line for admin trip cards from customers.saved_addresses JSONB. */
function summarizeSavedAddressesJson(saved: unknown): string | null {
  if (!saved || !Array.isArray(saved)) return null;
  const arr = saved as Address[];
  if (arr.length === 0) return null;
  const def = arr.find((a) => a.isDefault) ?? arr[0];
  const raw = def?.address;
  if (typeof raw !== 'string') return null;
  const line = raw.trim();
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

type SocietyTripRow = {
  id: string;
  customer_id: string;
  agency_name: string;
  scheduled_at: string;
  tanker_size_liters: number;
  photo_url: string;
  created_at: string;
};

function mapRow(row: SocietyTripRow): SocietyTrip {
  return {
    id: row.id,
    customerId: row.customer_id,
    agencyName: row.agency_name,
    scheduledAt: new Date(row.scheduled_at),
    tankerSizeLiters: row.tanker_size_liters,
    photoUrl: row.photo_url,
    createdAt: new Date(row.created_at),
    source: 'society_trip',
  };
}

type BookingTripRow = {
  id: string;
  customer_id: string;
  agency_name: string | null;
  scheduled_for: string | null;
  tanker_size: number;
  created_at: string;
};

function mapBookingRowToTrip(row: BookingTripRow): SocietyTrip {
  const scheduledAt = row.scheduled_for
    ? new Date(row.scheduled_for)
    : new Date(row.created_at);
  const name = row.agency_name?.trim();
  return {
    id: row.id,
    customerId: row.customer_id,
    agencyName: name || 'Booking',
    scheduledAt,
    tankerSizeLiters: row.tanker_size,
    photoUrl: '',
    createdAt: new Date(row.created_at),
    source: 'booking',
  };
}

export interface SocietyTripListOptions {
  /** Inclusive start of scheduled_at range (ISO boundaries recommended). */
  scheduledFrom?: Date;
  /** Exclusive or inclusive end — caller passes end-of-day; we use lte. */
  scheduledTo?: Date;
}

export class SocietyTripService {
  static async listTripsForAdmin(options?: SocietyTripListOptions): Promise<SocietyTrip[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        let q = supabase
          .from('society_trips')
          .select(
            'id, customer_id, agency_name, scheduled_at, tanker_size_liters, photo_url, created_at',
          )
          .order('scheduled_at', { ascending: false });

        if (options?.scheduledFrom) {
          q = q.gte('scheduled_at', options.scheduledFrom.toISOString());
        }
        if (options?.scheduledTo) {
          q = q.lte('scheduled_at', options.scheduledTo.toISOString());
        }

        const { data, error } = await q;

        if (error) {
          throw new Error(error.message || 'Failed to load society trips');
        }
        const societyRows = ((data ?? []) as SocietyTripRow[]).map(mapRow);

        const fromISO = options?.scheduledFrom?.toISOString();
        const toISO = options?.scheduledTo?.toISOString();

        let qBookScheduled = supabase
          .from('bookings')
          .select('id, customer_id, agency_name, scheduled_for, tanker_size, created_at')
          .not('scheduled_for', 'is', null)
          .order('scheduled_for', { ascending: false });
        if (fromISO) {
          qBookScheduled = qBookScheduled.gte('scheduled_for', fromISO);
        }
        if (toISO) {
          qBookScheduled = qBookScheduled.lte('scheduled_for', toISO);
        }

        let qBookCreated = supabase
          .from('bookings')
          .select('id, customer_id, agency_name, scheduled_for, tanker_size, created_at')
          .is('scheduled_for', null)
          .order('created_at', { ascending: false });
        if (fromISO) {
          qBookCreated = qBookCreated.gte('created_at', fromISO);
        }
        if (toISO) {
          qBookCreated = qBookCreated.lte('created_at', toISO);
        }

        const [bookSched, bookCreated] = await Promise.all([
          qBookScheduled,
          qBookCreated,
        ]);

        if (bookSched.error) {
          throw new Error(bookSched.error.message || 'Failed to load bookings (scheduled)');
        }
        if (bookCreated.error) {
          throw new Error(bookCreated.error.message || 'Failed to load bookings (unscheduled)');
        }

        const bookingTrips = [
          ...((bookSched.data ?? []) as BookingTripRow[]).map(mapBookingRowToTrip),
          ...((bookCreated.data ?? []) as BookingTripRow[]).map(mapBookingRowToTrip),
        ];

        const merged = [...societyRows, ...bookingTrips].sort(
          (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime(),
        );

        return merged;
      },
      {
        context: { operation: 'listTripsForAdmin', options },
        userFacing: false,
      },
    );
  }

  /**
   * Display labels for customer (society) user ids — direct users table read; admins may SELECT all users.
   */
  static async getUserDisplayByIds(ids: string[]): Promise<Map<string, { name: string; phone: string | null }>> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const map = new Map<string, { name: string; phone: string | null }>();
        const unique = [...new Set(ids)].filter(Boolean);
        if (unique.length === 0) {
          return map;
        }

        const { data, error } = await supabase
          .from('users')
          .select('id, name, phone')
          .in('id', unique);

        if (error) {
          throw new Error(error.message || 'Failed to load user names');
        }
        for (const row of data ?? []) {
          const r = row as { id: string; name: string | null; phone: string | null };
          map.set(r.id, {
            name: (r.name && r.name.trim()) || 'Unknown',
            phone: r.phone ?? null,
          });
        }
        return map;
      },
      {
        context: { operation: 'getUserDisplayByIds', count: ids.length },
        userFacing: false,
      },
    );
  }

  /**
   * Primary saved address line per customer user_id (society profile on Trip Details).
   */
  static async getCustomerAddressLineByUserIds(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const map = new Map<string, string | null>();
        const unique = [...new Set(userIds)].filter(Boolean);
        if (unique.length === 0) {
          return map;
        }

        const { data, error } = await supabase
          .from('customers')
          .select('user_id, saved_addresses')
          .in('user_id', unique);

        if (error) {
          throw new Error(error.message || 'Failed to load customer profiles');
        }
        for (const row of data ?? []) {
          const r = row as { user_id: string; saved_addresses: unknown };
          map.set(r.user_id, summarizeSavedAddressesJson(r.saved_addresses));
        }
        return map;
      },
      {
        context: { operation: 'getCustomerAddressLineByUserIds', count: userIds.length },
        userFacing: false,
      },
    );
  }
}
