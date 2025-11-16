// supabase/functions/send-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Send Notification Edge Function
 * 
 * Sends notifications (SMS, Email, Push) to users.
 * This is a template that can be extended with actual notification services.
 * 
 * Usage:
 * ```typescript
 * await EdgeFunctionsService.invokeWithAuth('send-notification', {
 *   userId: 'user-id',
 *   type: 'booking_confirmed',
 *   title: 'Booking Confirmed',
 *   message: 'Your water tanker booking has been confirmed',
 *   bookingId: 'booking-123'
 * }, clerkToken);
 * ```
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'driver_assigned' | 'payment_received' | 'delivery_completed';
  title: string;
  message: string;
  bookingId?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const clerkToken = authHeader?.replace('Bearer ', '');

    if (!clerkToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body: NotificationRequest = await req.json();

    // Validate required fields
    if (!body.userId || !body.type || !body.title || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, type, title, message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TODO: Verify Clerk token and get user ID
    // const { userId: clerkUserId } = await verifyClerkToken(clerkToken);

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone, email, name')
      .eq('id', body.userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Create notification record in database
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: body.type,
        title: body.title,
        message: body.message,
        booking_id: body.bookingId || null,
        metadata: body.metadata || {},
        read: false,
      })
      .select()
      .single();

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    // TODO: Send actual notifications
    // - SMS via Twilio: await sendSMS(user.phone, body.message);
    // - Email via SendGrid: await sendEmail(user.email, body.title, body.message);
    // - Push notification: await sendPushNotification(user.id, body.title, body.message);

    return new Response(
      JSON.stringify({
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
        },
        // In production, include actual delivery status
        deliveryStatus: {
          sms: 'pending', // or 'sent', 'failed'
          email: 'pending',
          push: 'pending',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Send notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

