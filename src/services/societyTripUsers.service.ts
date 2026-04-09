import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';

type UserLiteRow = {
  id: string;
  name: string;
  phone: string | null;
};

export type TripUserLite = {
  id: string;
  name: string;
  phone: string | null;
};

export class SocietyTripUsersService {
  static async getUsersLiteByIds(userIds: string[]): Promise<Map<string, TripUserLite>> {
    try {
      const ids = [...new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))];
      if (ids.length === 0) return new Map();

      const { data, error } = await supabase.from('users').select('id, name, phone').in('id', ids);
      if (error) throw new Error(error.message || 'Failed to load users');

      const rows = (data ?? []) as UserLiteRow[];
      const out = new Map<string, TripUserLite>();
      for (const r of rows) {
        out.set(r.id, { id: r.id, name: r.name, phone: r.phone ?? null });
      }
      return out;
    } catch (error) {
      handleError(error, {
        context: { operation: 'getUsersLiteByIds', userIdsCount: userIds.length },
        userFacing: false,
      });
      throw error;
    }
  }
}

