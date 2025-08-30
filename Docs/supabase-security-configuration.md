# Supabase Security Configuration Guide

## Overview

This document provides detailed instructions for addressing security warnings identified in our Supabase project. These recommendations are based on the security findings from the Supabase Security Advisor.

## 1. Function Search Path Security

### Background
Previously, some database functions had a mutable search path, which could potentially allow unauthorized schema access.

### Actions Taken
- Modified database functions to use `SECURITY DEFINER`
- Set a fixed `search_path = public` for critical functions
- Implemented in files:
  - `supabase/migrations/20250829000000_consolidated_schema.sql`
  - `schemas/enhanced_mvp_schema.sql`

## 2. One-Time Password (OTP) Expiry Configuration

### Security Concern
OTP expiry was set to more than one hour, which increases the risk of unauthorized access.

### Recommended Configuration
1. Log into Supabase Dashboard
2. Navigate to Authentication > Settings
3. Locate "OTP Expiry" or "Email OTP Expiry" setting
4. Reduce the expiry time to 30 minutes or less
   - Recommended setting: 30 minutes
   - Maximum recommended: 45 minutes

### Rationale
- Shorter OTP expiry reduces the window for potential unauthorized access
- Balances security with user experience

## 3. Leaked Password Protection

### Security Concern
Leaked password protection was previously disabled, leaving users vulnerable to using compromised passwords.

### Recommended Configuration
1. Log into Supabase Dashboard
2. Navigate to Authentication > Settings
3. Find "Leaked Password Protection" option
4. Enable the feature

### Rationale
- Prevents users from using passwords that have been exposed in known data breaches
- Leverages HaveIBeenPwned.org database to check password security
- Adds an additional layer of account protection

## Best Practices

1. Regularly review Supabase Security Advisor warnings
2. Keep Supabase and related dependencies up to date
3. Implement Row Level Security (RLS) on all exposed tables
4. Use strong, unique passwords
5. Enable multi-factor authentication

## Troubleshooting

If you encounter any issues while implementing these changes:
- Double-check dashboard settings
- Verify database function modifications
- Consult Supabase documentation
- Contact Supabase support if needed

## Version History

- 2025-08-29: Initial security configuration guide
- Modifications: Tracked in project version control

## Contact

For questions or further security recommendations, please contact the project security team.
