import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { subscriptionDataAccess } from '../lib/subscriptionDataAccess';
import { PaymentService } from './payment.service';
import { assertAgencySubscriptionActive } from '../utils/subscriptionGating';
import type { AgencyRazorpayAccount } from '../types/subscription.types';

export interface LinkedAccountStatus {
  status: AgencyRazorpayAccount['status'] | 'not_started';
  accountId?: string | null;
  businessName?: string | null;
  rejectionReason?: string | null;
  defaultCollectionMethod?: 'razorpay' | 'manual_qr';
  allowCashCollection?: boolean;
}

export interface OnboardingPayload {
  businessName: string;
  contactName?: string;
  contactEmail: string;
  contactPhone: string;
  pan?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  registeredStreet?: string;
  registeredStreet2?: string;
  registeredCity?: string;
  registeredState?: string;
  registeredPostalCode?: string;
}

async function parseEdgeFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // ignore
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

export interface PayoutSummary {
  today: number;
  week: number;
  month: number;
  pending: number;
  pendingSettlement: number;
}

function isTransferSettled(metadata: Record<string, unknown>): boolean {
  return metadata.transfer_status === 'processed';
}

export class AgencyPayoutService {
  static async getAccountStatus(): Promise<LinkedAccountStatus> {
    const { data, error } = await supabase.functions.invoke('get-linked-account-status', {
      body: {},
    });
    if (error) {
      return { status: 'not_started' };
    }
    return (data ?? { status: 'not_started' }) as LinkedAccountStatus;
  }

  static async submitOnboarding(payload: OnboardingPayload): Promise<LinkedAccountStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await assertAgencySubscriptionActive(user.id);
    }

    const { data, error } = await supabase.functions.invoke('create-linked-account', {
      body: payload,
    });
    if (error) {
      const message = await parseEdgeFunctionError(error, 'Failed to submit Razorpay onboarding');
      throw new Error(message);
    }
    const body = data as LinkedAccountStatus & { error?: string };
    if (body?.error) {
      throw new Error(body.error);
    }
    return body as LinkedAccountStatus;
  }

  static async refreshStatus(): Promise<LinkedAccountStatus> {
    return this.getAccountStatus();
  }

  static async getLocalAccount(agencyId: string): Promise<AgencyRazorpayAccount | null> {
    return subscriptionDataAccess.getAgencyRazorpayAccount(agencyId);
  }

  static async updateCollectionSettings(
    agencyId: string,
    settings: {
      defaultCollectionMethod?: 'razorpay' | 'manual_qr';
      allowCashCollection?: boolean;
    }
  ): Promise<void> {
    await subscriptionDataAccess.upsertAgencyRazorpaySettings(agencyId, settings);
  }

  static async getDeliveryPayments(agencyId: string) {
    return PaymentService.getAgencyDeliveryPayments(agencyId);
  }

  static async getPayoutSummary(agencyId: string): Promise<PayoutSummary> {
    const payments = await PaymentService.getAgencyDeliveryPayments(agencyId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const success = payments.filter((p) => p.status === 'success');
    const sumSince = (since: Date) =>
      success
        .filter((p) => p.completedAt && p.completedAt >= since)
        .reduce((acc, p) => acc + p.amount, 0);

    const pending = payments
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingSettlement = success
      .filter((p) => !isTransferSettled(p.metadata))
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      today: sumSince(startOfDay),
      week: sumSince(startOfWeek),
      month: sumSince(startOfMonth),
      pending,
      pendingSettlement,
    };
  }
}
