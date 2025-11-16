# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Water Tanker Booking App.

## Overview

Edge Functions are serverless functions that run on Supabase's infrastructure. They're perfect for:
- Server-side logic that shouldn't run in the client
- API integrations (payment gateways, SMS, email)
- Webhook handlers
- Background jobs
- Secure operations that require service role access

## Setup

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

### Environment Variables

Edge Functions can access environment variables. Set them in your Supabase dashboard:
- Go to Project Settings → Edge Functions → Secrets
- Add secrets like `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

## Creating a New Function

1. Create a new directory in `supabase/functions/`:
   ```bash
   mkdir supabase/functions/my-function
   ```

2. Create `index.ts` in the new directory

3. Use the example function as a template

4. Deploy the function:
   ```bash
   supabase functions deploy my-function
   ```

## Calling Functions from the App

Use the `EdgeFunctionsService` to call functions from your React Native app:

```typescript
import { EdgeFunctionsService } from '../services/edgeFunctions.service';
import { useAuth } from '@clerk/clerk-react'; // or your Clerk hook

// In your component
const { getToken } = useAuth();

const callFunction = async () => {
  const clerkToken = await getToken();
  
  const result = await EdgeFunctionsService.invokeWithAuth(
    'my-function',
    {
      param1: 'value1',
      param2: 'value2'
    },
    clerkToken
  );

  if (result.error) {
    console.error('Function error:', result.error);
  } else {
    console.log('Function result:', result.data);
  }
};
```

## Clerk Authentication

To verify Clerk tokens in your Edge Functions:

1. Install Clerk SDK in your function (add to `deno.json` or import):
   ```typescript
   import { verifyToken } from 'https://esm.sh/@clerk/clerk-sdk-node@latest';
   ```

2. Verify the token:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   const clerkToken = authHeader?.replace('Bearer ', '');
   
   try {
     const { userId } = await verifyToken(clerkToken);
     // Use userId to query your users table
   } catch (error) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized' }),
       { status: 401 }
     );
   }
   ```

## Available Functions

### example-function
A template function demonstrating:
- Request handling
- Clerk authentication
- Database queries
- Error handling

## Deployment

Deploy all functions:
```bash
supabase functions deploy
```

Deploy a specific function:
```bash
supabase functions deploy function-name
```

## Local Development

Run functions locally:
```bash
supabase functions serve
```

Test locally:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/function-name' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello"}'
```

## Best Practices

1. **Error Handling**: Always wrap your logic in try-catch blocks
2. **CORS**: Include CORS headers for browser requests
3. **Validation**: Validate input data before processing
4. **Security**: Never expose service role keys in client code
5. **Logging**: Use `console.log` for debugging (visible in Supabase dashboard)
6. **Type Safety**: Define TypeScript interfaces for request/response types

## Common Use Cases

### Payment Processing
- Integrate with payment gateways (Razorpay, Stripe)
- Handle webhooks securely
- Process refunds

### Notifications
- Send SMS via Twilio
- Send emails via SendGrid/Resend
- Push notifications

### Background Jobs
- Generate reports
- Process bulk operations
- Clean up old data

### Webhooks
- Handle external service webhooks
- Process third-party integrations
- Update database based on external events

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime Docs](https://deno.land/manual)
- [Clerk Authentication](https://clerk.com/docs)

