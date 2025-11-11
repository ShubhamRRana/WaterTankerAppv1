// Payment service for Cash on Delivery (COD) implementation
// This is a simplified version for MVP - payment gateway integration will be added in v2

import { supabase } from './supabase';

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process Cash on Delivery payment - marks payment as pending in Supabase
   */
  static async processCODPayment(bookingId: string, amount: number): Promise<PaymentResult> {
    try {
      // For COD, we just mark the payment as pending in the booking
      // The actual payment happens when the driver delivers
      const paymentId = `cod_${bookingId}_${Date.now()}`;
      
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'pending',
          payment_id: paymentId,
        })
        .eq('id', bookingId);

      if (error) {
        return {
          success: false,
          error: error.message || 'Payment processing failed',
        };
      }
      
      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Mark payment as completed when driver confirms delivery
   */
  static async confirmCODPayment(bookingId: string): Promise<PaymentResult> {
    try {
      const paymentId = `cod_confirmed_${bookingId}_${Date.now()}`;
      
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',
          payment_id: paymentId,
        })
        .eq('id', bookingId);

      if (error) {
        return {
          success: false,
          error: error.message || 'Payment confirmation failed',
        };
      }
      
      return {
        success: true,
        paymentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed',
      };
    }
  }

  // Future implementation for online payments (v2)
  static async processOnlinePayment(
    bookingId: string,
    amount: number,
    paymentMethod: 'razorpay' | 'stripe'
  ): Promise<PaymentResult> {
    // This will be implemented in v2 with actual payment gateway integration
    throw new Error('Online payments not implemented in MVP. Use COD instead.');
  }
}
