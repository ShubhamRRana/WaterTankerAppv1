import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';

export interface SocietyTrip {
  id: string;
  customerId: string;
  agencyName: string;
  agencyAdminId: string | null;
  scheduledAt: Date;
  tankerSizeLiters: number;
  tankerAmount: number | null;
  photoUrls: string[];
  createdAt: Date;
}

type SocietyTripRow = {
  id: string;
  customer_id: string;
  agency_name: string;
  agency_admin_id: string | null;
  scheduled_at: string;
  tanker_size_liters: number;
  tanker_amount: number | null;
  photo_urls: unknown;
  created_at: string;
};

function parsePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((u): u is string => typeof u === 'string' && u.length > 0))];
}

function mapRow(row: SocietyTripRow): SocietyTrip {
  return {
    id: row.id,
    customerId: row.customer_id,
    agencyName: row.agency_name,
    agencyAdminId: row.agency_admin_id ?? null,
    scheduledAt: new Date(row.scheduled_at),
    tankerSizeLiters: row.tanker_size_liters,
    tankerAmount:
      row.tanker_amount != null && Number.isFinite(row.tanker_amount) ? row.tanker_amount : null,
    photoUrls: parsePhotoUrls(row.photo_urls),
    createdAt: new Date(row.created_at),
  };
}

export class SocietyTripService {
  static async listTripsForAdmin(adminId: string, businessName?: string): Promise<SocietyTrip[]> {
    try {
      const normalizedBusinessName = typeof businessName === 'string' ? businessName.trim() : '';
      const orParts = [
        `agency_admin_id.eq.${adminId}`,
        ...(normalizedBusinessName ? [`agency_name.eq.${JSON.stringify(normalizedBusinessName)}`] : []),
      ];

      const { data, error } = await supabase
        .from('society_trips')
        .select(
          'id, customer_id, agency_name, agency_admin_id, scheduled_at, tanker_size_liters, tanker_amount, photo_urls, created_at',
        )
        .or(orParts.join(','))
        .order('scheduled_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to load trips');
      }

      const rows = (data ?? []) as SocietyTripRow[];
      return rows.map(mapRow);
    } catch (error) {
      handleError(error, {
        context: { operation: 'listSocietyTripsForAdmin', adminId, businessName },
        userFacing: false,
      });
      throw error;
    }
  }
}

