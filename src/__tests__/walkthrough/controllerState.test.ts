import { shouldAutoStart, shouldPersistOnClose } from '../../walkthrough/controllerState';

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
});
