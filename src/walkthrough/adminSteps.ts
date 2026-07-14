import type { AdminStackParamList } from '../navigation/AdminNavigator';

export type WalkthroughTargetId =
  | 'bookings.list'
  | 'bookings.menu'
  | 'drivers.add'
  | 'vehicles.add'
  | 'payments.qr'
  | 'expenses.add'
  | 'reports.summary'
  | 'profile.subscription'
  | 'profile.replay';

export type AdminWalkthroughStepId =
  | 'welcome'
  | 'bookings'
  | 'drivers'
  | 'vehicles'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'profile';

export type AdminWalkthroughStep = {
  id: AdminWalkthroughStepId;
  route: keyof AdminStackParamList | null;
  title: string;
  body: string;
  primaryTarget: WalkthroughTargetId | null;
  fallbackTarget?: WalkthroughTargetId;
};

export const ADMIN_WALKTHROUGH_STEPS: readonly AdminWalkthroughStep[] = [
  {
    id: 'welcome',
    route: null,
    title: 'Your agency is live',
    body: 'Your free trial has started. This short tour shows how to run bookings, crew, and collections.',
    primaryTarget: null,
  },
  {
    id: 'bookings',
    route: 'Bookings',
    title: 'Bookings',
    body: 'View today\'s bookings and open trip details from here.',
    primaryTarget: 'bookings.list',
    fallbackTarget: 'bookings.menu',
  },
  {
    id: 'drivers',
    route: 'Drivers',
    title: 'Drivers',
    body: 'Add drivers and assign them to your fleet.',
    primaryTarget: 'drivers.add',
  },
  {
    id: 'vehicles',
    route: 'Vehicles',
    title: 'Vehicles',
    body: 'Register tankers and keep vehicle details up to date.',
    primaryTarget: 'vehicles.add',
  },
  {
    id: 'payments',
    route: 'BankAccounts',
    title: 'Payments & QR',
    body: 'Configure bank accounts and share your agency QR for collections.',
    primaryTarget: 'payments.qr',
  },
  {
    id: 'expenses',
    route: 'Expenses',
    title: 'Expenses',
    body: 'Record operating expenses to keep finances organized.',
    primaryTarget: 'expenses.add',
  },
  {
    id: 'reports',
    route: 'Reports',
    title: 'Reports',
    body: 'Review trip and revenue summaries at a glance.',
    primaryTarget: 'reports.summary',
  },
  {
    id: 'profile',
    route: 'Profile',
    title: 'Profile & subscription',
    body: 'Check subscription status or replay this tour anytime.',
    primaryTarget: 'profile.subscription',
    fallbackTarget: 'profile.replay',
  },
];

export function resolveStepTarget(
  step: AdminWalkthroughStep,
  availableIds: Set<WalkthroughTargetId>,
): WalkthroughTargetId | null {
  if (step.primaryTarget && availableIds.has(step.primaryTarget)) {
    return step.primaryTarget;
  }
  if (step.fallbackTarget && availableIds.has(step.fallbackTarget)) {
    return step.fallbackTarget;
  }
  return null;
}
