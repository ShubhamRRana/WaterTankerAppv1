export type TourMode = 'auto' | 'replay';

export function shouldAutoStart(seenAt: Date | null | undefined): boolean {
  return seenAt === null;
}

export function shouldPersistOnClose(mode: TourMode): boolean {
  return mode === 'auto';
}
