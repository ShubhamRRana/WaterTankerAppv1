export type TourMode = 'auto' | 'replay';

export function shouldAutoStart(seenAt: Date | null | undefined): boolean {
  return seenAt === null;
}

export function shouldPersistOnClose(mode: TourMode): boolean {
  return mode === 'auto';
}

export async function persistIfNeeded(
  mode: TourMode,
  adminId: string,
  markSeen: (id: string) => Promise<void>,
): Promise<void> {
  if (!shouldPersistOnClose(mode)) return;
  await markSeen(adminId);
}
