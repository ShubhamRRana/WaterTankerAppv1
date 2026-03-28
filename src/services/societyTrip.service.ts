import { supabase } from '../lib/supabaseClient';
import { SocietyTrip } from '../types';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

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
        const rows = (data ?? []) as SocietyTripRow[];
        return rows.map(mapRow);
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
}
