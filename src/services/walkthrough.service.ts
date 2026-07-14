import { supabase } from '../lib/supabaseClient';

export const WalkthroughService = {
  async getSeenAt(adminUserId: string): Promise<Date | null | undefined> {
    const { data, error } = await supabase
      .from('admins')
      .select('walkthrough_seen_at')
      .eq('user_id', adminUserId)
      .maybeSingle();
    if (error) return undefined;
    if (!data || data.walkthrough_seen_at == null) return null;
    return new Date(data.walkthrough_seen_at as string);
  },

  async markSeen(adminUserId: string): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .update({ walkthrough_seen_at: new Date().toISOString() })
      .eq('user_id', adminUserId);
    if (error) throw error;
  },
};
