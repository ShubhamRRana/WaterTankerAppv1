import { persistIfNeeded, shouldAutoStart, shouldPersistOnClose } from '../../walkthrough/controllerState';

describe('controllerState', () => {
  it('auto-starts only for null', () => {
    expect(shouldAutoStart(null)).toBe(true);
    expect(shouldAutoStart(new Date())).toBe(false);
    expect(shouldAutoStart(undefined)).toBe(false);
  });

  it('persists only in auto mode', () => {
    expect(shouldPersistOnClose('auto')).toBe(true);
    expect(shouldPersistOnClose('replay')).toBe(false);
  });

  describe('persistIfNeeded', () => {
    it('calls markSeen in auto mode', async () => {
      const markSeen = jest.fn().mockResolvedValue(undefined);
      await persistIfNeeded('auto', 'admin-1', markSeen);
      expect(markSeen).toHaveBeenCalledWith('admin-1');
    });

    it('does not call markSeen in replay mode', async () => {
      const markSeen = jest.fn().mockResolvedValue(undefined);
      await persistIfNeeded('replay', 'admin-1', markSeen);
      expect(markSeen).not.toHaveBeenCalled();
    });
  });
});
