/**
 * Data Access Layer Exports
 * 
 * Central export point for data access layer components.
 * This allows easy swapping between LocalStorage and Supabase implementations.
 */

export { IDataAccessLayer, IUserDataAccess, IBookingDataAccess, IVehicleDataAccess } from './dataAccess.interface';
export { LocalStorageDataAccess, dataAccess } from './localStorageDataAccess';
export { SubscriptionManager, subscriptionManager, createManagedSubscription } from './subscriptionManager';
export type { SubscriptionCallback, CollectionSubscriptionCallback, Unsubscribe } from './dataAccess.interface';

