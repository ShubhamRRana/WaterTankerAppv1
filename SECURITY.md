# Security Documentation

## Overview

This document outlines the security measures implemented in the Water Tanker Booking App, including authentication, authorization, data protection, and security monitoring.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication Security](#authentication-security)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Protection](#data-protection)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Rate Limiting](#rate-limiting)
7. [Session Management](#session-management)
8. [Security Monitoring](#security-monitoring)
9. [Security Auditing](#security-auditing)
10. [Best Practices](#best-practices)
11. [Security Checklist](#security-checklist)

---

## Security Architecture

### Multi-Layer Security Approach

The application implements a multi-layer security approach:

1. **Client-Side Security**
   - Input validation and sanitization
   - Client-side rate limiting
   - Session management
   - Security event logging

2. **Backend Security (Supabase)**
   - Row Level Security (RLS) policies
   - Supabase Auth (password hashing, session management)
   - Server-side rate limiting
   - Database-level constraints

3. **Network Security**
   - HTTPS/TLS encryption (handled by Supabase)
   - Secure API endpoints

---

## Authentication Security

### Password Security

- **Password Hashing**: Handled automatically by Supabase Auth using industry-standard bcrypt
- **Password Requirements**: 
  - Minimum length: 6 characters (configurable)
  - Maximum length: 128 characters
  - Stored securely in Supabase Auth (never in application database)

### Authentication Flow

1. **Registration**
   - Input sanitization (phone, name)
   - Rate limiting (3 attempts per hour per phone)
   - Duplicate user check
   - Security event logging
   - Supabase Auth account creation
   - User profile creation in database

2. **Login**
   - Input sanitization (phone)
   - Rate limiting (5 attempts per 15 minutes per phone)
   - Brute force detection (alerts after 5 failed attempts)
   - Security event logging
   - Session creation via Supabase Auth

3. **Logout**
   - Session termination
   - Security event logging
   - Session cleanup

### Security Features

- **Rate Limiting**: Prevents brute force attacks
- **Brute Force Detection**: Automatically detects and logs suspicious patterns
- **Session Hijack Detection**: Detects authentication mismatches
- **Multi-Role Support**: Secure role selection for users with multiple roles

---

## Authorization & Access Control

### Row Level Security (RLS)

All database tables have RLS policies enabled to ensure users can only access their own data:

#### Users Table
- Users can read/update their own profile
- Admins can read/update all users
- Drivers can read customer profiles (for booking details)
- Customers can read driver profiles (for booking details)

#### Addresses Table
- Users can only access their own addresses
- Full CRUD operations restricted to owner

#### Bookings Table
- Customers can read/create/update their own bookings
- Drivers can read available bookings and their assigned bookings
- Admins have full access

#### Vehicles Table
- Admins can manage vehicles for their agency
- Full access restricted to agency owners

### Role-Based Access Control

The application implements three user roles:

1. **Customer**: Can create bookings, manage addresses, view own bookings
2. **Driver**: Can view available bookings, accept bookings, update booking status
3. **Admin**: Full system access, can manage users, vehicles, pricing, bookings

---

## Data Protection

### Data Encryption

- **In Transit**: All data encrypted via HTTPS/TLS (handled by Supabase)
- **At Rest**: Database encryption handled by Supabase
- **Sensitive Data**: Passwords never stored in application database

### Data Privacy

- **Phone Number Masking**: Phone numbers are masked in security logs (only last 4 digits shown)
- **Identifier Masking**: User identifiers are masked in security logs
- **No Password Storage**: Passwords are never stored in the application database

### Data Validation

- All user inputs are validated before processing
- Database constraints ensure data integrity
- Foreign key relationships maintain referential integrity

---

## Input Validation & Sanitization

### Validation Utilities

The application includes comprehensive validation utilities:

- **Phone Numbers**: Indian format validation (10 digits, starts with 6-9)
- **Passwords**: Length validation (6-128 characters)
- **Names**: Character validation (letters, spaces, common name characters)
- **Emails**: Format validation (when used)
- **Addresses**: Text validation and sanitization
- **Numbers**: Numeric validation for amounts, capacities, etc.
- **Dates**: Date format validation

### Sanitization Utilities

All user inputs are sanitized to prevent XSS and injection attacks:

- **String Sanitization**: Removes script tags, HTML entities, dangerous protocols
- **Phone Sanitization**: Removes non-digit characters
- **Name Sanitization**: Removes special characters, keeps only valid name characters
- **Email Sanitization**: Removes dangerous characters
- **Address Sanitization**: Removes script tags and dangerous HTML
- **Number Sanitization**: Ensures numeric values only

### Implementation

All forms use validation and sanitization:
- RegisterScreen
- LoginScreen
- BookingScreen
- ProfileScreen
- VehicleManagementScreen
- SavedAddressesScreen

---

## Rate Limiting

### Client-Side Rate Limiting

The application implements client-side rate limiting to complement server-side limits:

#### Authentication Limits
- **Login**: 5 attempts per 15 minutes
- **Registration**: 3 attempts per hour
- **Password Reset**: 3 attempts per hour

#### API Limits
- **API Calls**: 100 requests per minute
- **Booking Creation**: 10 bookings per hour
- **Profile Updates**: 20 updates per hour
- **Data Export**: 5 exports per day

### Rate Limit Features

- **Per-Identifier Tracking**: Rate limits tracked per phone/user
- **Automatic Cleanup**: Expired entries cleaned up automatically
- **Reset Time Tracking**: Users informed when limits reset
- **Security Logging**: Rate limit violations logged as security events

---

## Session Management

### Session Features

- **Automatic Refresh**: Supabase handles automatic token refresh
- **Idle Timeout**: 30 minutes of inactivity (configurable)
- **Maximum Duration**: 24 hours (configurable)
- **Activity Monitoring**: Tracks last activity timestamp
- **Session Validation**: Periodic checks for session validity

### Session Security

- **Session Expiration**: Automatic logout on timeout
- **Session Hijack Detection**: Detects authentication mismatches
- **Multiple Session Detection**: Can detect concurrent sessions (future enhancement)
- **Secure Storage**: Sessions stored securely by Supabase Auth

### Session Events

All session events are logged:
- Session creation
- Session refresh
- Session expiration
- Session hijack attempts
- Logout

---

## Security Monitoring

### Security Event Logging

The application logs all security-related events:

#### Authentication Events
- Login attempts (success/failure)
- Registration attempts (success/failure)
- Logout events

#### Session Events
- Session expiration
- Session refresh
- Session hijack attempts
- Multiple session detection

#### Authorization Events
- Unauthorized access attempts
- Permission denied events
- Role escalation attempts

#### Suspicious Activities
- Brute force attempts
- Rate limit exceeded
- Suspicious patterns
- Invalid input detected

### Security Logger Features

- **Event Types**: 20+ security event types
- **Severity Levels**: INFO, WARNING, CRITICAL
- **Event Storage**: Last 500 events in memory
- **Pattern Detection**: Automatic detection of suspicious patterns
- **Statistics**: Security statistics and analytics

### Integration with Error Logger

Critical security events are also logged to the error logger for centralized monitoring.

---

## Security Auditing

### Security Audit Utility

The application includes a security audit utility that checks:

#### Configuration Checks
- Supabase URL configuration
- Supabase anon key configuration
- Service role key security (should not be exposed)
- URL format validation

#### Environment Checks
- Development mode detection
- Console logging configuration

#### Authentication Checks
- Supabase Auth connection
- Session validity

#### Data Validation Checks
- Input validation utilities availability
- Input sanitization utilities availability

### Audit Results

Audit results include:
- Overall status (secure, needs_attention, vulnerable)
- Individual check results (pass, fail, warning)
- Recommendations for improvements
- Statistics (passed, failed, warning counts)

### Running Security Audits

```typescript
import { securityAuditor } from './utils/securityAudit';

// Run comprehensive audit
const result = await securityAuditor.runAudit();

// Get recommendations
const recommendations = securityAuditor.getRecommendations(result);

// Format results for display
const formatted = securityAuditor.formatAuditResults(result);
```

---

## Best Practices

### For Developers

1. **Always Sanitize Inputs**: Use `SanitizationUtils` for all user inputs
2. **Validate Before Processing**: Use `ValidationUtils` before processing data
3. **Log Security Events**: Use `securityLogger` for security-related events
4. **Check Rate Limits**: Use `rateLimiter` before expensive operations
5. **Monitor Sessions**: Use `sessionManager` for session management
6. **Run Security Audits**: Regularly run security audits in development

### For Administrators

1. **Review Security Logs**: Regularly review security event logs
2. **Monitor Failed Logins**: Watch for brute force attempts
3. **Check Rate Limits**: Monitor rate limit violations
4. **Review Audit Results**: Run security audits regularly
5. **Update Dependencies**: Keep dependencies up to date
6. **Rotate Keys**: Rotate API keys if exposed

### For Users

1. **Use Strong Passwords**: Choose passwords with sufficient length
2. **Don't Share Credentials**: Never share login credentials
3. **Logout When Done**: Always logout when finished
4. **Report Suspicious Activity**: Report any suspicious activity

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables configured correctly
- [ ] `.env` file not committed to version control
- [ ] Service role key not exposed in client code
- [ ] Security audit passes all checks
- [ ] Rate limiting configured appropriately
- [ ] Session timeout configured appropriately
- [ ] Input validation enabled on all forms
- [ ] Input sanitization enabled on all forms
- [ ] Security logging enabled
- [ ] Error boundaries implemented
- [ ] RLS policies tested and verified

### Post-Deployment

- [ ] Monitor security event logs regularly
- [ ] Review failed login attempts
- [ ] Check for rate limit violations
- [ ] Monitor session expiration events
- [ ] Review unauthorized access attempts
- [ ] Check for suspicious patterns
- [ ] Run security audits periodically
- [ ] Update dependencies regularly
- [ ] Review and update RLS policies as needed

### Ongoing Maintenance

- [ ] Weekly security log review
- [ ] Monthly security audit
- [ ] Quarterly dependency updates
- [ ] Annual security review
- [ ] Regular RLS policy review
- [ ] Monitor for security advisories

---

## Security Utilities Reference

### Security Logger

```typescript
import { securityLogger, SecurityEventType, SecuritySeverity } from './utils/securityLogger';

// Log authentication attempt
securityLogger.logAuthAttempt(phone, success, error, userId);

// Log registration attempt
securityLogger.logRegistrationAttempt(phone, role, success, error, userId);

// Log unauthorized access
securityLogger.logUnauthorizedAccess(userId, userRole, attemptedAction, resource);

// Log brute force attempt
securityLogger.logBruteForceAttempt(identifier, attempts);

// Get security statistics
const stats = securityLogger.getStatistics();
```

### Rate Limiter

```typescript
import { rateLimiter } from './utils/rateLimiter';

// Check if action is allowed
const { allowed, remaining, resetTime } = rateLimiter.isAllowed('login', phone);

// Record an action
rateLimiter.record('login', phone);

// Get remaining attempts
const remaining = rateLimiter.getRemaining('login', phone);
```

### Session Manager

```typescript
import { sessionManager } from './utils/sessionManager';

// Initialize session manager
await sessionManager.initialize();

// Update activity
sessionManager.updateActivity();

// Check if session is valid
const isValid = await sessionManager.isSessionValid();

// Get current session
const session = sessionManager.getCurrentSession();
```

### Security Auditor

```typescript
import { securityAuditor } from './utils/securityAudit';

// Run security audit
const result = await securityAuditor.runAudit();

// Get recommendations
const recommendations = securityAuditor.getRecommendations(result);

// Format results
const formatted = securityAuditor.formatAuditResults(result);
```

---

## Security Incident Response

### If Security Breach Detected

1. **Immediate Actions**
   - Log the security event
   - Revoke affected sessions
   - Notify administrators
   - Document the incident

2. **Investigation**
   - Review security logs
   - Identify affected users
   - Determine scope of breach
   - Document findings

3. **Remediation**
   - Fix security vulnerability
   - Reset affected user passwords
   - Update security measures
   - Notify affected users (if required)

4. **Prevention**
   - Update security policies
   - Enhance monitoring
   - Review and update RLS policies
   - Conduct security audit

---

## Additional Resources

- [Supabase Security Documentation](https://supabase.com/docs/guides/auth/security)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)

---

*Last Updated: 2024-12-19*
*Document Version: 1.0*

