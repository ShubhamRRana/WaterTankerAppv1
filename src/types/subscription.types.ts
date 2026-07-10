export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'paused';

export type PaymentTransactionStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type SubscriptionPlanAccountKind = 'agency' | 'individual' | 'society';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  durationMonths: number;
  price: number;
  currency: string;
  features: string[];
  maxBookingsPerMonth: number | null;
  isActive: boolean;
  displayOrder: number;
  accountKind?: SubscriptionPlanAccountKind | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date | null;
  endDate: Date | null;
  autoRenew: boolean;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  trialEndDate: Date | null;
  isTrial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paymentGateway: string;
  gatewayOrderId: string | null;
  gatewayTransactionId: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
  status: PaymentTransactionStatus;
  paymentMethod: string | null;
  bankName: string | null;
  metadata: Record<string, unknown>;
  initiatedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyRazorpayAccount {
  id: string;
  agencyId: string;
  razorpayAccountId: string | null;
  status: 'not_started' | 'created' | 'under_review' | 'active' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  businessName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  allowCashCollection: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionData {
  planId?: string;
  status?: SubscriptionStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  autoRenew?: boolean;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
}
