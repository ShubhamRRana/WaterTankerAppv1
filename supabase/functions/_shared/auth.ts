// supabase/functions/_shared/auth.ts

/**
 * Shared authentication utilities for Edge Functions
 */

/**
 * Extract and validate Bearer token from Authorization header
 * 
 * @param authHeader - The Authorization header value
 * @returns The token if valid, null if invalid or missing
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Validate that the header starts with "Bearer " (case-insensitive)
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return null;
  }

  // Extract token part (everything after "Bearer ")
  const token = authHeader.substring(bearerPrefix.length).trim();

  // Ensure token is not empty
  if (!token) {
    return null;
  }

  return token;
}

/**
 * Verify Clerk token and extract user ID
 * 
 * @param token - The Clerk JWT token
 * @returns The Clerk user ID if token is valid
 * @throws Error if token is invalid
 */
export async function verifyClerkToken(token: string): Promise<string> {
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  
  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY not configured');
  }

  // TODO: Implement actual Clerk token verification
  // For now, this is a placeholder that should be replaced with actual verification
  // Example implementation:
  // import { verifyToken } from 'https://esm.sh/@clerk/clerk-sdk-node@latest';
  // const { userId } = await verifyToken(token, { secretKey: clerkSecretKey });
  // return userId;

  // Placeholder: In production, replace this with actual Clerk SDK verification
  throw new Error('Clerk token verification not yet implemented. Please implement verifyClerkToken function.');
}

