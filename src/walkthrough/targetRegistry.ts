import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { WalkthroughTargetId } from './adminSteps';

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MEASURE_TIMEOUT_MS = 400;

const targets = new Map<WalkthroughTargetId, RefObject<View>>();

export const targetRegistry = {
  register(id: WalkthroughTargetId, ref: RefObject<View>): () => void {
    targets.set(id, ref);
    return () => {
      if (targets.get(id) === ref) {
        targets.delete(id);
      }
    };
  },

  getAvailableIds(): Set<WalkthroughTargetId> {
    return new Set(targets.keys());
  },

  measure(id: WalkthroughTargetId): Promise<Rect | null> {
    const ref = targets.get(id);
    if (!ref?.current) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);

      ref.current!.measureInWindow((x, y, width, height) => {
        clearTimeout(timeoutId);
        resolve({ x, y, width, height });
      });
    });
  },

  clear(): void {
    targets.clear();
  },
};
