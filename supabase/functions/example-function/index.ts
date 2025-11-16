// supabase/functions/example-function/index.ts
/// <reference lib="dom" />
// @ts-ignore - Deno URL imports are valid at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - Deno URL imports are valid at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Example Supabase Edge Function
 * 
 * This is a template function that demonstrates:
 * - How to handle requests
 * - How to verify Clerk authentication
 * - How to interact with Supabase database
 * - Error handling
 * 
 * To use this function:
 * 1. Deploy it: supabase functions deploy example-function
 * 2. Call it from your app using EdgeFunctionsService
 * 
 * Example usage from app:
 * ```typescript
 * const result = await EdgeFunctionsService.invokeWithAuth('example-function', {
 *   message: 'Hello from the app!'
 * }, clerkToken);
 * ```
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  message?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Clerk token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const clerkToken = authHeader?.replace('Bearer ', '');

    // Parse request body
    const body: RequestBody = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TODO: Verify Clerk token here
    // You can use Clerk's SDK or verify the JWT manually
    // Example:
    // const clerkUserId = await verifyClerkToken(clerkToken);
    
    // For now, we'll use a placeholder
    // In production, verify the Clerk token and get the user ID
    const clerkUserId = body.userId || 'placeholder-user-id';

    // Example: Query the database
    // Map Clerk user ID to your users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId) // Assuming you add this column
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error(`Database error: ${userError.message}`);
    }

    // Process the request
    const response = {
      success: true,
      message: body.message || 'Hello from Edge Function!',
      clerkUserId,
      user: user || null,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
