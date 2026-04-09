import { supabase } from '../lib/supabaseClient';
import { handleError } from '../utils/errorHandler';

type SocietyPaymentPeriodCompletedRow = {
  customer_id: string;
  period_key: string;
  completed_at: string | null;
};

export class SocietyPaymentPeriodsService {
  static async listCompletedCustomerIdsForPeriod(periodKey: string, customerIds: string[]): Promise<Set<string>> {
    try {
      const ids = [...new Set(customerIds.filter((id) => typeof id === 'string' && id.length > 0))];
      if (ids.length === 0) return new Set();

      const { data, error } = await supabase
        .from('society_payment_periods_completed')
        .select('customer_id, period_key, completed_at')
        .eq('period_key', periodKey)
        .in('customer_id', ids);

      if (error) throw new Error(error.message || 'Failed to load payment completion');

      const rows = (data ?? []) as SocietyPaymentPeriodCompletedRow[];
      const completed = new Set<string>();
      for (const r of rows) {
        if (r.completed_at) completed.add(r.customer_id);
      }
      return completed;
    } catch (error) {
      handleError(error, {
        context: { operation: 'listCompletedCustomerIdsForPeriod', periodKey, customerIdsCount: customerIds.length },
        userFacing: false,
      });
      throw error;
    }
  }
}

