import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';

type SocietyPaymentPeriodCompletedRow = {
  customer_id: string;
  period_key: string;
  completed_at: string | null;
};

export class SocietyPaymentPeriodsService {
  /** Matches society customer app: `m:2026-4` or `m:2026-4|agency name` (lowercase agency). */
  static buildMonthPeriodKey(year: number, monthIndex0: number, agencyName?: string): string {
    const base = `m:${year}-${monthIndex0}`;
    const trimmed = typeof agencyName === 'string' ? agencyName.trim() : '';
    if (!trimmed) return base;
    return `${base}|${trimmed.toLowerCase()}`;
  }

  /** Rows with non-null completed_at → customer id → completion timestamp (period_key filter applied in query). */
  static async listCompletedAtByCustomerForPeriod(
    periodKey: string,
    customerIds: string[],
    options?: { fallbackPeriodKey?: string },
  ): Promise<Map<string, Date>> {
    try {
      const ids = [...new Set(customerIds.filter((id) => typeof id === 'string' && id.length > 0))];
      if (ids.length === 0) return new Map();

      const keys = [...new Set([periodKey, options?.fallbackPeriodKey].filter((k): k is string => !!k))];
      const { data, error } = await supabase
        .from('society_payment_periods_completed')
        .select('customer_id, period_key, completed_at')
        .in('period_key', keys)
        .in('customer_id', ids);

      if (error) throw new Error(error.message || 'Failed to load payment completion');

      const rows = (data ?? []) as SocietyPaymentPeriodCompletedRow[];
      const map = new Map<string, Date>();
      for (const r of rows) {
        if (!r.completed_at) continue;
        const d = new Date(r.completed_at);
        if (Number.isNaN(d.getTime())) continue;
        const prev = map.get(r.customer_id);
        if (!prev || d.getTime() > prev.getTime()) map.set(r.customer_id, d);
      }
      return map;
    } catch (error) {
      handleError(error, {
        context: { operation: 'listCompletedAtByCustomerForPeriod', periodKey, customerIdsCount: customerIds.length },
        userFacing: false,
      });
      throw error;
    }
  }

  static async listCompletedCustomerIdsForPeriod(periodKey: string, customerIds: string[]): Promise<Set<string>> {
    const map = await this.listCompletedAtByCustomerForPeriod(periodKey, customerIds);
    return new Set(map.keys());
  }
}

