import { supabase } from './supabaseClient';
import type {
  CreateSubscriptionData,
  PaymentTransaction,
  SubscriptionPlan,
  UpdateSubscriptionData,
  UserSubscription,
  AgencyRazorpayAccount,
} from '../types/subscription.types';

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapPlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    durationMonths: Number(row.duration_months),
    price: Number(row.price),
    currency: String(row.currency ?? 'INR'),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    maxBookingsPerMonth: row.max_bookings_per_month != null
      ? Number(row.max_bookings_per_month)
      : null,
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order ?? 0),
    accountKind: (row.account_kind as SubscriptionPlan['accountKind']) ?? null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapSubscription(row: Record<string, unknown>): UserSubscription {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    planId: String(row.plan_id),
    status: row.status as UserSubscription['status'],
    startDate: parseDate(row.start_date as string | null),
    endDate: parseDate(row.end_date as string | null),
    autoRenew: Boolean(row.auto_renew),
    cancelledAt: parseDate(row.cancelled_at as string | null),
    cancellationReason: row.cancellation_reason != null
      ? String(row.cancellation_reason)
      : null,
    trialEndDate: parseDate(row.trial_end_date as string | null),
    isTrial: Boolean(row.is_trial),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapPayment(row: Record<string, unknown>): PaymentTransaction {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    subscriptionId: row.subscription_id != null ? String(row.subscription_id) : null,
    amount: Number(row.amount),
    currency: String(row.currency ?? 'INR'),
    paymentGateway: String(row.payment_gateway ?? 'razorpay'),
    gatewayOrderId: row.gateway_order_id != null ? String(row.gateway_order_id) : null,
    gatewayTransactionId: row.gateway_transaction_id != null
      ? String(row.gateway_transaction_id)
      : null,
    gatewayResponseCode: row.gateway_response_code != null
      ? String(row.gateway_response_code)
      : null,
    gatewayResponseMessage: row.gateway_response_message != null
      ? String(row.gateway_response_message)
      : null,
    status: row.status as PaymentTransaction['status'],
    paymentMethod: row.payment_method != null ? String(row.payment_method) : null,
    bankName: row.bank_name != null ? String(row.bank_name) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    initiatedAt: new Date(String(row.initiated_at ?? row.created_at)),
    completedAt: parseDate(row.completed_at as string | null),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapAgencyAccount(row: Record<string, unknown>): AgencyRazorpayAccount {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    razorpayAccountId: row.razorpay_account_id != null
      ? String(row.razorpay_account_id)
      : null,
    status: row.status as AgencyRazorpayAccount['status'],
    rejectionReason: row.rejection_reason != null ? String(row.rejection_reason) : null,
    businessName: row.business_name != null ? String(row.business_name) : null,
    contactName: row.contact_name != null ? String(row.contact_name) : null,
    contactEmail: row.contact_email != null ? String(row.contact_email) : null,
    contactPhone: row.contact_phone != null ? String(row.contact_phone) : null,
    allowCashCollection: row.allow_cash_collection !== false,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export const subscriptionDataAccess = {
  async getAgencyPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .eq('account_kind', 'agency')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapPlan(row as Record<string, unknown>));
  },

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPlan(data as Record<string, unknown>) : null;
  },

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) return null;
    const now = Date.now();
    const active = data.find(
      (s) =>
        s.status === 'active' &&
        s.end_date &&
        new Date(s.end_date as string).getTime() > now
    );
    if (active) return mapSubscription(active as Record<string, unknown>);
    const pending = data.find((s) => s.status === 'pending');
    if (pending) return mapSubscription(pending as Record<string, unknown>);
    return mapSubscription(data[0] as Record<string, unknown>);
  },

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_active_subscription', {
      p_user_id: userId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async provisionAgencyTrial(userId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('provision_agency_trial', {
      p_user_id: userId,
    });
    if (error) throw error;
    return data != null ? String(data) : null;
  },

  async createSubscription(data: CreateSubscriptionData): Promise<UserSubscription> {
    const { data: row, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: data.userId,
        plan_id: data.planId,
        status: data.status ?? 'pending',
        auto_renew: data.autoRenew ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSubscription(row as Record<string, unknown>);
  },

  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.planId !== undefined) update.plan_id = data.planId;
    if (data.status !== undefined) update.status = data.status;
    if (data.startDate !== undefined) {
      update.start_date = data.startDate?.toISOString() ?? null;
    }
    if (data.endDate !== undefined) {
      update.end_date = data.endDate?.toISOString() ?? null;
    }
    if (data.autoRenew !== undefined) update.auto_renew = data.autoRenew;
    if (data.cancelledAt !== undefined) {
      update.cancelled_at = data.cancelledAt?.toISOString() ?? null;
    }
    if (data.cancellationReason !== undefined) {
      update.cancellation_reason = data.cancellationReason;
    }
    const { error } = await supabase.from('subscriptions').update(update).eq('id', id);
    if (error) throw error;
  },

  async getPaymentTransactionsByUser(userId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  },

  async getDeliveryPaymentsByAgency(agencyId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .contains('metadata', { agency_id: agencyId })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  },

  async getAgencyRazorpayAccount(agencyId: string): Promise<AgencyRazorpayAccount | null> {
    const { data, error } = await supabase
      .from('agency_razorpay_accounts')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (error?.code === '42P01') return null;
    if (error) throw error;
    return data ? mapAgencyAccount(data as Record<string, unknown>) : null;
  },

  async upsertAgencyRazorpaySettings(
    agencyId: string,
    settings: Partial<Pick<AgencyRazorpayAccount, 'allowCashCollection'>>
  ): Promise<void> {
    const existing = await this.getAgencyRazorpayAccount(agencyId);
    const payload = {
      agency_id: agencyId,
      allow_cash_collection: settings.allowCashCollection,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { error } = await supabase
        .from('agency_razorpay_accounts')
        .update(payload)
        .eq('agency_id', agencyId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('agency_razorpay_accounts').insert(payload);
      if (error) throw error;
    }
  },
};
