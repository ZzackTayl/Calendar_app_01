# Security Setup Guide

This guide helps you configure the security features and environment variables required for the PolyHarmony Calendar application.

## Quick Start

### 1. Environment Setup

Choose one of the following methods to set up your environment variables:

#### Interactive Setup (Recommended)
```bash
npm run setup:env:interactive
```
This will guide you through setting up all required environment variables interactively.

#### Quick Development Setup
```bash
npm run setup:env:dev
```
This creates a basic development environment with generated secure keys.

#### Test Environment Setup
```bash
npm run setup:env:test
```
This creates a test environment for CI/CD and testing.

### 2. Security Validation

After setting up your environment, validate the security configuration:

```bash
npm run security:validate
```

### 3. Run Security Tests

Run the comprehensive security test suite:

```bash
npm run security:test
```

## Required Environment Variables

### Core Security Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Yes | Generated automatically |
| `NEXTAUTH_URL` | Application URL | Yes | `http://localhost:3000` (dev) |
| `ENCRYPTION_KEY` | AES-256 encryption key | Yes | 64-character hex string |

### Optional Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SENDGRID_API_KEY` | SendGrid API key for email | No | `SG.xxx` |
| `RESEND_API_KEY` | Resend API key for email | No | `re_xxx` |

## Security Features

### 🔒 Production Security Hardening

- **Environment-specific configurations**: Different security settings for development vs production
- **Demo mode restrictions**: Automatically disabled in production environments
- **Security headers**: Comprehensive security headers including CSP, HSTS, X-Frame-Options
- **Session security**: Configurable session timeouts and validation

### 🚨 Real-time Security Monitoring

- **Security event logging**: All security-related events are logged and monitored
- **Real-time alerts**: Immediate notifications for critical security events
- **Incident response**: Automated response to security incidents
- **Security metrics**: Comprehensive security metrics and risk scoring

### 🔄 Continuous Security Validation

- **Automated testing**: Security tests run automatically in CI/CD
- **Health monitoring**: Continuous monitoring of security system health
- **Configuration validation**: Regular validation of security configuration
- **Compliance checks**: Automated compliance validation

## Security Commands

### Environment Setup
```bash
# Interactive environment setup
npm run setup:env:interactive

# Quick development setup
npm run setup:env:dev

# Test environment setup
npm run setup:env:test
```

### Security Validation
```bash
# Validate security configuration
npm run security:validate

# Initialize production security
npm run security:init

# Run security test suite
npm run security:test

# Run specific security test categories
npm run security:test:config
npm run security:test:auth
```

### Security Monitoring
```bash
# Check security health
npm run security:health

# Start continuous security monitoring
npm run security:monitor
```

## GitHub Actions Integration

The security system includes comprehensive GitHub Actions workflows that automatically:

1. **Run security tests** on every push and pull request
2. **Validate configuration** for different environments
3. **Scan dependencies** for vulnerabilities
4. **Generate security reports** with detailed results

### Setting Up GitHub Secrets

For production deployment validation, add these secrets to your GitHub repository:

1. Go to your repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add the following secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ENCRYPTION_KEY`

## Security Best Practices

### 🔐 Environment Variables

1. **Never commit secrets**: Use `.env.local` for local development (already in `.gitignore`)
2. **Use strong keys**: Always generate cryptographically secure keys
3. **Rotate regularly**: Regularly rotate API keys and secrets
4. **Environment separation**: Use different keys for development, staging, and production

### 🛡️ Production Deployment

1. **HTTPS only**: Always use HTTPS in production
2. **Strong passwords**: Enforce strong password policies
3. **Session security**: Configure appropriate session timeouts
4. **Demo mode**: Ensure demo mode is disabled in production

### 🚨 Monitoring

1. **Enable alerts**: Configure real-time security alerts
2. **Monitor logs**: Regularly review security logs
3. **Incident response**: Have an incident response plan
4. **Regular audits**: Perform regular security audits

## Troubleshooting

### Common Issues

#### Missing Environment Variables
```bash
# Error: Missing required variable: NEXT_PUBLIC_SUPABASE_URL
npm run setup:env:interactive
```

#### Invalid Encryption Key Format
```bash
# Error: ENCRYPTION_KEY must be a 64-character hexadecimal string
npm run setup:env:dev  # This will generate a new valid key
```

#### Security Test Failures
```bash
# Run specific test category to identify issues
npm run security:test:config
npm run security:test:auth
```

#### GitHub Actions Failures
- Ensure all required secrets are configured in GitHub repository settings
- Check that environment variables are properly formatted
- Review the security test report artifacts for detailed error information

### Getting Help

1. **Check the logs**: Security events are logged with detailed information
2. **Run diagnostics**: Use `npm run security:validate` to identify configuration issues
3. **Review documentation**: Check this guide and inline code documentation
4. **Security reports**: Review generated security reports for detailed analysis

## Security Architecture

The security system consists of several interconnected components:

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Middleware        │    │  Security Monitor   │    │  Incident Response  │
│   - Route Protection│    │  - Event Logging    │    │  - Auto Response    │
│   - Session Valid.  │    │  - Real-time Alerts │    │  - Escalation       │
│   - Security Headers│    │  - Risk Scoring     │    │  - Tracking         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                    ┌─────────────────────┐
                    │  Security Config    │
                    │  - Environment      │
                    │  - Production Rules │
                    │  - Compliance       │
                    └─────────────────────┘
```

This architecture ensures comprehensive security coverage from the application layer through monitoring and incident response.