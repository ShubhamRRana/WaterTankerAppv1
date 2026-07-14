import { ADMIN_WALKTHROUGH_STEPS, resolveStepTarget } from '../../walkthrough/adminSteps';

describe('adminSteps', () => {
  it('orders welcome then each feature', () => {
    expect(ADMIN_WALKTHROUGH_STEPS.map((s) => s.id)).toEqual([
      'welcome', 'bookings', 'drivers', 'vehicles', 'payments', 'expenses', 'reports', 'profile',
    ]);
  });

  it('prefers primary target', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'drivers')!;
    expect(resolveStepTarget(step, new Set(['drivers.add']))).toBe('drivers.add');
  });

  it('uses fallback when primary missing', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'bookings')!;
    expect(resolveStepTarget(step, new Set(['bookings.menu']))).toBe('bookings.menu');
  });

  it('returns null when nothing available', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'drivers')!;
    expect(resolveStepTarget(step, new Set())).toBeNull();
  });
});
