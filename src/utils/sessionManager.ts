/**
 * Session Manager Utility
 * 
 * Enhanced session management with timeout, device tracking, and security checks.
 * Complements Supabase Auth session management with additional security features.
 */

import { supabase } from '../services/supabase';
import { securityLogger, SecurityEventType } from './securityLogger';

export interface SessionInfo {
  userId: string;
  userRole: string;
  createdAt: Date;
  lastActivity: Date;
  deviceId?: string;
  expiresAt?: Date;
}

export interface SessionConfig {
  maxIdleTime: number; // Maximum idle time in milliseconds (default: 30 minutes)
  maxSessionDuration: number; // Maximum session duration in milliseconds (default: 24 hours)
  checkInterval: number; // How often to check session validity (default: 1 minute)
}

class SessionManager {
  private currentSession: SessionInfo | null = null;
  private activityTimer: ReturnType<typeof setInterval> | null = null;
  private config: SessionConfig = {
    maxIdleTime: 30 * 60 * 1000, // 30 minutes
    maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    checkInterval: 60 * 1000, // 1 minute
  };

  /**
   * Initialize session manager
   */
  async initialize(): Promise<void> {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Get user data from database
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single();

      if (dbUser) {
        this.currentSession = {
          userId: session.user.id,
          userRole: dbUser.role,
          createdAt: new Date(session.created_at ? parseInt(session.created_at) * 1000 : Date.now()),
          lastActivity: new Date(),
        };

        // Start activity monitoring
        this.startActivityMonitoring();
      }
    }

    // Monitor Supabase auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date();
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      this.clearSession();
      return false;
    }

    // Check idle time
    const idleTime = Date.now() - this.currentSession.lastActivity.getTime();
    if (idleTime > this.config.maxIdleTime) {
      await this.handleSessionTimeout('idle');
      return false;
    }

    // Check session duration
    if (this.currentSession.expiresAt) {
      if (Date.now() > this.currentSession.expiresAt.getTime()) {
        await this.handleSessionTimeout('expired');
        return false;
      }
    }

    return true;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Clear session
   */
  async clearSession(): Promise<void> {
    if (this.currentSession) {
      securityLogger.log(
        SecurityEventType.LOGOUT,
        'info' as any,
        {
          userId: this.currentSession.userId,
          sessionDuration: Date.now() - this.currentSession.createdAt.getTime(),
        },
        this.currentSession.userId,
        this.currentSession.userRole
      );
    }

    this.currentSession = null;
    this.stopActivityMonitoring();
  }

  /**
   * Set session configuration
   */
  setConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Handle auth state changes from Supabase
   */
  private async handleAuthStateChange(
    event: string,
    session: any
  ): Promise<void> {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        if (session?.user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', session.user.id)
            .single();

          if (dbUser) {
            this.currentSession = {
              userId: session.user.id,
              userRole: dbUser.role,
              createdAt: new Date(),
              lastActivity: new Date(),
            };

            if (event === 'TOKEN_REFRESHED') {
              securityLogger.log(
                SecurityEventType.SESSION_REFRESHED,
                'info' as any,
                {},
                session.user.id,
                dbUser.role
              );
            }

            this.startActivityMonitoring();
          }
        }
        break;

      case 'SIGNED_OUT':
        await this.clearSession();
        break;

      case 'USER_UPDATED':
        // Update session if user data changed
        if (this.currentSession && session?.user) {
          this.updateActivity();
        }
        break;
    }
  }

  /**
   * Start monitoring session activity
   */
  private startActivityMonitoring(): void {
    this.stopActivityMonitoring(); // Clear any existing timer

    this.activityTimer = setInterval(async () => {
      const isValid = await this.isSessionValid();
      if (!isValid) {
        // Session is invalid, will be handled by isSessionValid
        return;
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring session activity
   */
  private stopActivityMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(reason: 'idle' | 'expired'): Promise<void> {
    if (this.currentSession) {
      securityLogger.logSessionEvent(
        SecurityEventType.SESSION_EXPIRED,
        this.currentSession.userId,
        { reason }
      );

      // Sign out from Supabase
      await supabase.auth.signOut();
      await this.clearSession();
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

