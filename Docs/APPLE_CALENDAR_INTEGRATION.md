# Apple Calendar CalDAV Integration

## Overview

This implementation provides secure, real-time integration with Apple Calendar using the CalDAV protocol. It replaces the previous fake authentication system with a complete, production-ready solution.

## Key Features

- **Real Encryption**: Uses AES-256-GCM encryption to securely store Apple ID and app-specific passwords
- **Connection Testing**: Actually tests CalDAV connectivity before storing credentials
- **Proper Validation**: Validates Apple ID format and app-specific password format
- **Error Handling**: Comprehensive error handling with specific user feedback
- **Secure Storage**: Credentials are encrypted before database storage and decrypted only when needed

## Security Implementation

### Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256-bit (32 bytes)
- **Authentication**: Built-in authentication tag prevents tampering
- **IV**: Unique initialization vector for each encryption operation

### Key Management
- Encryption key stored in environment variables only
- Never committed to version control
- Different keys recommended for different environments
- Key rotation supported (requires re-encryption of existing credentials)

## Setup Instructions

### 1. Generate Encryption Key

```bash
# Run the key generation script
node scripts/generate-encryption-key.js

# Or generate manually
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Environment Configuration

Add to your `.env.local`:

```env
# CRITICAL: 64-character hex string for AES-256 encryption
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
```

### 3. Database Schema

The integration uses existing database fields:
- `apple_calendar_access_token`: Stores encrypted Apple ID
- `apple_calendar_refresh_token`: Stores encrypted app-specific password  
- `apple_calendar_token_expires_at`: Expiration timestamp

## API Endpoints

### Authentication Endpoint
`POST /api/auth/apple`

Authenticates with Apple Calendar and stores encrypted credentials.

**Request Body:**
```json
{
  "appleId": "user@icloud.com",
  "appSpecificPassword": "abcd-efgh-ijkl-mnop"
}
```

**Response Success:**
```json
{
  "message": "Successfully connected to Apple Calendar",
  "calendars_found": 3,
  "connection_tested": true
}
```

**Response Errors:**
- `400`: Invalid Apple ID or app-specific password format
- `401`: Authentication failed with iCloud
- `403`: iCloud access forbidden
- `404`: No calendars found
- `500`: Server error

### Sync Endpoint
`POST /api/calendar/apple/sync`

Syncs events from Apple Calendar to the application database.

**Response Success:**
```json
{
  "message": "Successfully synced Apple Calendar",
  "sync_summary": {
    "calendars_found": 3,
    "events_processed": 25,
    "events_synced": 24,
    "events_failed": 1,
    "sync_period": {
      "start_date": "2025-08-01T00:00:00.000Z",
      "end_date": "2025-08-31T23:59:59.999Z"
    },
    "sync_completed_at": "2025-08-26T01:30:00.000Z"
  },
  "warnings": ["Event abc123: Database constraint violation"]
}
```

## Apple Calendar Setup Requirements

### User Requirements
1. **Apple ID**: Valid Apple ID with iCloud Calendar enabled
2. **Two-Factor Authentication**: Must be enabled on the Apple ID
3. **App-Specific Password**: Generate in Apple ID account settings

### Generating App-Specific Password
1. Sign in to [appleid.apple.com](https://appleid.apple.com)
2. Go to "Security" section
3. Click "Generate Password..." under App-Specific Passwords
4. Enter a label (e.g., "Calendar Sync")
5. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

## CalDAV Configuration

### iCloud CalDAV Server
- **Server URL**: `https://caldav.icloud.com`
- **Authentication**: HTTP Basic Auth
- **Username**: Apple ID (email address)
- **Password**: App-specific password

### Calendar Discovery
The system automatically discovers all calendars available to the user:
- Personal calendars
- Shared calendars
- Subscribed calendars (read-only)

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Invalid credentials or expired app-specific password
- **403 Forbidden**: iCloud Calendar disabled or 2FA not set up
- **Network errors**: Connection issues with iCloud servers

### Sync Errors
- **Credential expiry**: Re-authentication required
- **Calendar access**: Specific calendar no longer accessible
- **Event conflicts**: Database constraint violations

### Troubleshooting
1. **Check credentials**: Ensure Apple ID and app-specific password are correct
2. **Verify 2FA**: Two-factor authentication must be enabled
3. **Test connectivity**: Check network access to `caldav.icloud.com`
4. **Review logs**: Check server logs for specific error messages

## Database Integration

### Event Mapping
CalDAV events are mapped to the application's event schema:

```typescript
{
  user_id: string,
  title: string, // From SUMMARY
  description?: string, // From DESCRIPTION
  location?: string, // From LOCATION
  start_time: string, // From DTSTART
  end_time: string, // From DTEND
  is_all_day: boolean, // From VALUE=DATE
  time_zone: string, // From timezone info
  recurrence_rule?: string, // From RRULE
  external_calendar_id: string, // From UID
  external_calendar_source: 'apple_calendar',
  privacy_level: 'private'
}
```

### Sync Strategy
- **Upsert operations**: Events updated based on `external_calendar_id`
- **Time range**: Currently syncs one month (start to end of current month)
- **Conflict resolution**: Database constraints prevent duplicates
- **Error tolerance**: Individual event failures don't stop overall sync

## Security Considerations

### Data Protection
- **Encryption at rest**: All credentials encrypted in database
- **Encryption in transit**: HTTPS for all CalDAV communications
- **Memory safety**: Credentials cleared from memory after use
- **Logging safety**: Credentials never logged in plaintext

### Access Control
- **User isolation**: Users can only access their own calendar data
- **Authentication required**: All endpoints require valid session
- **Rate limiting**: Should be implemented for production use

### Compliance
- **GDPR**: Supports data export and deletion
- **Privacy**: User controls what calendar data is synced
- **Audit trail**: All sync operations logged for debugging

## Performance Optimization

### Caching Strategy
- **Calendar discovery**: Cache calendar list for short periods
- **Event fetching**: Batch operations where possible
- **Database operations**: Use upsert for efficient updates

### Scalability
- **Connection pooling**: Reuse CalDAV connections
- **Async operations**: All I/O operations are asynchronous
- **Error recovery**: Graceful handling of temporary failures

## Testing

### Unit Tests
Test coverage should include:
- Encryption/decryption functions
- Apple ID validation
- App-specific password validation
- CalDAV client operations
- Error handling scenarios

### Integration Tests
- End-to-end authentication flow
- Calendar sync operations
- Database operations
- Error recovery

### Manual Testing
1. **Valid credentials**: Test with real Apple ID and app-specific password
2. **Invalid credentials**: Test error handling
3. **Network issues**: Test offline/connectivity scenarios
4. **Edge cases**: Empty calendars, special characters, etc.

## Monitoring and Logging

### Key Metrics
- Authentication success/failure rates
- Sync completion times
- Error frequencies by type
- Calendar and event counts

### Logging Strategy
- **Info level**: Successful operations and summaries
- **Warn level**: Recoverable errors and retries
- **Error level**: Failed operations and exceptions
- **Debug level**: Detailed operation traces (development only)

### Example Log Entries
```
INFO: Starting Apple Calendar sync for user: abc123
INFO: Successfully discovered 3 calendars
INFO: Fetched 25 events from calendar: /principals/user/calendars/home/
WARN: Failed to upsert event xyz789: Duplicate key violation
INFO: Apple Calendar sync completed: 24/25 events synced
ERROR: CalDAV connection failed: Authentication error
```

## Migration from Fake Implementation

### Required Changes
1. **Environment setup**: Add encryption key
2. **Database data**: Existing fake-encrypted data must be cleared
3. **User re-authentication**: All users must re-authenticate
4. **Testing**: Comprehensive testing with real Apple credentials

### Migration Script
```sql
-- Clear existing fake-encrypted data
UPDATE users 
SET 
  apple_calendar_access_token = NULL,
  apple_calendar_refresh_token = NULL,
  apple_calendar_token_expires_at = NULL
WHERE 
  apple_calendar_access_token LIKE 'encrypted_%';

-- Update integration setup status
UPDATE calendar_integration_setup 
SET 
  apple_calendar_setup_completed = FALSE,
  setup_status = 'pending',
  setup_error_message = 'Re-authentication required after security upgrade'
WHERE apple_calendar_setup_completed = TRUE;
```

## Future Enhancements

### Planned Features
- **Selective sync**: Choose which calendars to sync
- **Bidirectional sync**: Create/update events in Apple Calendar
- **Real-time updates**: Webhook-based sync triggers
- **Advanced scheduling**: Custom sync intervals per user

### Performance Improvements
- **Incremental sync**: Only fetch changed events
- **Parallel processing**: Sync multiple calendars simultaneously
- **Caching layer**: Redis/Memcached for frequently accessed data
- **CDN integration**: Cache calendar metadata

---

## Support and Troubleshooting

For issues with Apple Calendar integration:

1. Check the application logs for specific error messages
2. Verify Apple ID credentials and app-specific password
3. Ensure iCloud Calendar is enabled and accessible
4. Test CalDAV connectivity using external tools
5. Review database constraints and migration status

This implementation provides a secure, scalable foundation for Apple Calendar integration that can be extended for additional features and improved performance.