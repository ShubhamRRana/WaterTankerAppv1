import type { RefObject } from 'react';
import type { View } from 'react-native';
import { targetRegistry } from '../../walkthrough/targetRegistry';

function mockRef(
  measureInWindow?: View['measureInWindow'],
): RefObject<View | null> {
  return {
    current: {
      measureInWindow: measureInWindow ?? jest.fn(),
    } as unknown as View,
  };
}

describe('targetRegistry', () => {
  beforeEach(() => {
    targetRegistry.clear();
  });

  it('registers and exposes available ids', () => {
    const ref = mockRef();
    targetRegistry.register('drivers.add', ref);
    expect(targetRegistry.getAvailableIds()).toEqual(new Set(['drivers.add']));
  });

  it('unregisters on cleanup', () => {
    const ref = mockRef();
    const unregister = targetRegistry.register('drivers.add', ref);
    unregister();
    expect(targetRegistry.getAvailableIds()).toEqual(new Set());
  });

  it('replaces registration when the same id is registered again', () => {
    const first = mockRef();
    const second = mockRef();
    const unregisterFirst = targetRegistry.register('drivers.add', first);
    targetRegistry.register('drivers.add', second);
    unregisterFirst();
    expect(targetRegistry.getAvailableIds()).toEqual(new Set(['drivers.add']));
  });

  it('returns null when measuring an unknown id', async () => {
    await expect(targetRegistry.measure('drivers.add')).resolves.toBeNull();
  });

  it('returns null when the ref has no current node', async () => {
    const ref = { current: null } as RefObject<View | null>;
    targetRegistry.register('drivers.add', ref);
    await expect(targetRegistry.measure('drivers.add')).resolves.toBeNull();
  });

  it('measures via measureInWindow', async () => {
    const measureInWindow = jest.fn((callback) => {
      callback(10, 20, 100, 50);
    });
    targetRegistry.register('drivers.add', mockRef(measureInWindow));
    await expect(targetRegistry.measure('drivers.add')).resolves.toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
    expect(measureInWindow).toHaveBeenCalledTimes(1);
  });

  it('returns null when measureInWindow does not respond within 400ms', async () => {
    jest.useFakeTimers();
    targetRegistry.register('drivers.add', mockRef());
    const measurePromise = targetRegistry.measure('drivers.add');
    jest.advanceTimersByTime(400);
    await expect(measurePromise).resolves.toBeNull();
    jest.useRealTimers();
  });

  it('clears all registrations', () => {
    targetRegistry.register('drivers.add', mockRef());
    targetRegistry.register('vehicles.add', mockRef());
    targetRegistry.clear();
    expect(targetRegistry.getAvailableIds()).toEqual(new Set());
  });
});
