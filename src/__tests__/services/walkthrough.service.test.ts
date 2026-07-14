import { WalkthroughService } from '../../services/walkthrough.service';
import { supabase } from '../../lib/supabaseClient';

jest.mock('../../lib/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

describe('WalkthroughService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when walkthrough_seen_at is null', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { walkthrough_seen_at: null }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toBeNull();
  });

  it('returns Date when set', async () => {
    const iso = '2026-07-14T10:00:00.000Z';
    const maybeSingle = jest.fn().mockResolvedValue({ data: { walkthrough_seen_at: iso }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toEqual(new Date(iso));
  });

  it('returns undefined on error', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toBeUndefined();
  });

  it('markSeen updates timestamp', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      update: () => ({ eq }),
    });
    await WalkthroughService.markSeen('admin-1');
    expect(eq).toHaveBeenCalledWith('user_id', 'admin-1');
  });
});
