import { supabase } from '../lib/supabaseClient';
import { subscriptionDataAccess } from '../lib/subscriptionDataAccess';
import { PaymentService } from './payment.service';
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
}

export interface PayoutSummary {
  today: number;
  week: number;
  month: number;
  pending: number;
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
    const { data, error } = await supabase.functions.invoke('create-linked-account', {
      body: payload,
    });
    if (error) {
      throw new Error('Failed to submit Razorpay onboarding');
    }
    return data as LinkedAccountStatus;
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

    return {
      today: sumSince(startOfDay),
      week: sumSince(startOfWeek),
      month: sumSince(startOfMonth),
      pending,
    };
  }
}
