# Edge Functions Setup Guide

This guide will help you set up and use Supabase Edge Functions in your Water Tanker Booking App.

## Prerequisites

1. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```

2. **Supabase Account**: Make sure you have a Supabase project created

3. **Project Reference**: Get your project reference ID from your Supabase dashboard

## Initial Setup

### 1. Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

### 2. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your actual Supabase project reference ID (found in your project settings).

### 3. Set Environment Variables

In your Supabase dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (for database access)
   - `CLERK_SECRET_KEY` - Your Clerk secret key (for token verification)

## Available Functions

### 1. example-function
A template function demonstrating basic structure and Clerk authentication.

**Deploy:**
```bash
npm run functions:deploy:example
```

**Usage:**
```typescript
import { EdgeFunctionsService } from '../services/edgeFunctions.service';

const result = await EdgeFunctionsService.invokeWithAuth(
  'example-function',
  { message: 'Hello!' },
  clerkToken
);
```

### 2. send-notification
Sends notifications to users (SMS, Email, Push).

**Deploy:**
```bash
supabase functions deploy send-notification
```

**Usage:**
```typescript
const result = await EdgeFunctionsService.invokeWithAuth(
  'send-notification',
  {
    userId: 'user-123',
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: 'Your water tanker booking has been confirmed',
    bookingId: 'booking-456'
  },
  clerkToken
);
```

## Creating a New Function

1. **Create function directory:**
   ```bash
   mkdir supabase/functions/my-new-function
   ```

2. **Create `index.ts`:**
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };

   serve(async (req) => {
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: corsHeaders });
     }

     try {
       // Your function logic here
       return new Response(
         JSON.stringify({ success: true }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
       );
     }
   });
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy my-new-function
   ```

## Calling Functions from Your App

### Basic Usage

```typescript
import { EdgeFunctionsService } from '../services/edgeFunctions.service';

// With Clerk authentication
const { getToken } = useAuth(); // From Clerk
const token = await getToken();

const result = await EdgeFunctionsService.invokeWithAuth(
  'function-name',
  { param1: 'value1' },
  token
);

if (result.error) {
  console.error('Error:', result.error.message);
} else {
  console.log('Success:', result.data);
}
```

### Public Function (No Auth)

```typescript
const result = await EdgeFunctionsService.invokePublic(
  'public-function',
  { param1: 'value1' }
);
```

## Clerk Authentication in Functions

To verify Clerk tokens in your Edge Functions:

1. **Install Clerk SDK** (add to your function):
   ```typescript
   import { verifyToken } from 'https://esm.sh/@clerk/clerk-sdk-node@latest';
   ```

2. **Verify token:**
   ```typescript
   const authHeader = req.headers.get('Authorization');
   const clerkToken = authHeader?.replace('Bearer ', '');

   try {
     const { userId } = await verifyToken(clerkToken, {
       secretKey: Deno.env.get('CLERK_SECRET_KEY'),
     });
     // Use userId to query your users table
   } catch (error) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized' }),
       { status: 401 }
     );
   }
   ```

## Local Development

### Start Local Functions Server

```bash
npm run functions:serve
```

This starts a local server at `http://localhost:54321/functions/v1/`

### Test Locally

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/example-function' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello from local!"}'
```

## Deployment

### Deploy All Functions

```bash
npm run functions:deploy
```

### Deploy Specific Function

```bash
supabase functions deploy function-name
```

### List Deployed Functions

```bash
npm run functions:list
```

## Common Use Cases

### 1. Payment Processing
- Integrate with Razorpay/Stripe
- Handle payment webhooks
- Process refunds

### 2. SMS Notifications
- Send booking confirmations
- Send OTP codes
- Send delivery updates

### 3. Email Notifications
- Send booking receipts
- Send invoice emails
- Send promotional emails

### 4. Background Jobs
- Generate reports
- Process bulk operations
- Clean up old data

### 5. Webhooks
- Handle external service webhooks
- Process third-party integrations

## Troubleshooting

### Function Not Found
- Make sure you've deployed the function: `supabase functions deploy function-name`
- Check function name matches exactly (case-sensitive)

### Authentication Errors
- Verify Clerk token is being passed correctly
- Check Clerk secret key is set in Supabase secrets
- Ensure token verification logic is correct

### Database Access Issues
- Use service role key for database operations in functions
- Check RLS policies if using anon key
- Verify Supabase URL and keys are set correctly

### CORS Issues
- Make sure CORS headers are included in function responses
- Check that `Access-Control-Allow-Origin` is set to `*` or your domain

## Next Steps

1. **Integrate Clerk**: Set up Clerk authentication and update functions to verify tokens
2. **Add Notification Services**: Integrate Twilio (SMS), SendGrid (Email), or Firebase (Push)
3. **Payment Integration**: Create functions for Razorpay/Stripe integration
4. **Webhook Handlers**: Create functions to handle external webhooks

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime Docs](https://deno.land/manual)
- [Clerk Authentication](https://clerk.com/docs)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

