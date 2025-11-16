// src/services/edgeFunctions.service.ts

import { supabase } from './supabase';

/**
 * Edge Functions Service
 * 
 * Service for calling Supabase Edge Functions from the application.
 * Supports Clerk authentication by passing Clerk JWT tokens.
 * 
 * Usage:
 * ```typescript
 * import { EdgeFunctionsService } from './edgeFunctions.service';
 * 
 * // Call an edge function
 * const result = await EdgeFunctionsService.invoke('function-name', {
 *   param1: 'value1',
 *   param2: 'value2'
 * });
 * 
 * // Call with Clerk token
 * const clerkToken = await getToken(); // From Clerk
 * const result = await EdgeFunctionsService.invokeWithAuth('function-name', {
 *   param1: 'value1'
 * }, clerkToken);
 * ```
 */

export interface EdgeFunctionResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export class EdgeFunctionsService {
  /**
   * Invoke a Supabase Edge Function
   * 
   * @param functionName - Name of the Edge Function to invoke
   * @param body - Request body to send to the function
   * @param options - Optional configuration (headers, etc.)
   * @returns Promise resolving to the function response
   */
  static async invoke<T = any>(
    functionName: string,
    body?: Record<string, any>,
    options?: {
      headers?: Record<string, string>;
      clerkToken?: string;
    }
  ): Promise<EdgeFunctionResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options?.headers,
      };

      // Add Clerk token if provided
      if (options?.clerkToken) {
        headers['Authorization'] = `Bearer ${options.clerkToken}`;
      }

      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body: body || {},
        headers,
      });

      if (error) {
        return {
          error: {
            message: error.message || 'Edge function invocation failed',
            code: error.name,
          },
        };
      }

      return { data };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Invoke an Edge Function with Clerk authentication
   * 
   * @param functionName - Name of the Edge Function to invoke
   * @param body - Request body to send to the function
   * @param clerkToken - Clerk JWT token for authentication
   * @returns Promise resolving to the function response
   */
  static async invokeWithAuth<T = any>(
    functionName: string,
    body: Record<string, any>,
    clerkToken: string
  ): Promise<EdgeFunctionResponse<T>> {
    return this.invoke<T>(functionName, body, {
      clerkToken,
    });
  }

  /**
   * Invoke an Edge Function without authentication
   * Useful for public endpoints
   * 
   * @param functionName - Name of the Edge Function to invoke
   * @param body - Request body to send to the function
   * @returns Promise resolving to the function response
   */
  static async invokePublic<T = any>(
    functionName: string,
    body?: Record<string, any>
  ): Promise<EdgeFunctionResponse<T>> {
    return this.invoke<T>(functionName, body);
  }
}

