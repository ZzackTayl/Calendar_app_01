# Apple Calendar Integration Setup Guide

This guide explains how to set up Apple Calendar integration with PolyHarmony using the CalDAV protocol.

## What is CalDAV?

CalDAV (Calendar Extensions to WebDAV) is an internet standard protocol that allows applications to access and manage calendar data on remote servers. Apple Calendar uses CalDAV for synchronization.

## Prerequisites

1. **Apple ID** - Your Apple account email address
2. **App-Specific Password** - A special password for third-party applications
3. **iCloud Calendar** - Your calendar must be synced to iCloud

## Step 1: Generate an App-Specific Password

Apple requires app-specific passwords for third-party applications to access your calendar data.

### How to Create an App-Specific Password:

1. **Enable Two-Factor Authentication** (if not already enabled):
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in with your Apple ID
   - Go to "Security" section
   - Enable "Two-Factor Authentication"

2. **Generate App-Specific Password**:
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in with your Apple ID
   - Go to "Security" section
   - Click "Generate Password" under "App-Specific Passwords"
   - Enter a name (e.g., "PolyHarmony Calendar")
   - Click "Create"
   - **Save this password** - you won't be able to see it again!

## Step 2: Configure Your Calendar Settings

1. **Ensure iCloud Calendar Sync**:
   - On your iPhone/iPad: Settings → [Your Name] → iCloud → Calendars (turn ON)
   - On your Mac: System Preferences → Apple ID → iCloud → Calendars (turn ON)

2. **Verify Calendar Sharing**:
   - Make sure your calendars are set to sync with iCloud
   - Check that the calendars you want to sync are visible in iCloud

## Step 3: Connect to PolyHarmony

1. **Go to Settings** in your PolyHarmony app
2. **Find "Calendar Integrations"** section
3. **Click "Connect to Apple Calendar"**
4. **Enter your credentials**:
   - **Apple ID**: Your Apple account email address
   - **App-Specific Password**: The password you generated in Step 1
5. **Click "Connect"**

## Step 4: Sync Your Calendar

Once connected, PolyHarmony will:

1. **Discover your calendars** on iCloud
2. **Sync events** from the current month
3. **Store events** in your PolyHarmony database
4. **Keep them synchronized** with your Apple Calendar

## How It Works

### CalDAV Protocol Flow:

1. **Discovery**: PolyHarmony discovers available calendars on iCloud
2. **Authentication**: Uses your Apple ID and app-specific password
3. **Query**: Requests events within a specific time range
4. **Parse**: Converts iCal format to PolyHarmony's event format
5. **Store**: Saves events to your database with external calendar references

### Data Flow:

```
Apple Calendar (iCloud) ←→ CalDAV Protocol ←→ PolyHarmony
```

## Troubleshooting

### Common Issues:

1. **"Authentication Failed"**
   - Verify your Apple ID is correct
   - Ensure you're using an app-specific password (not your regular Apple ID password)
   - Check that two-factor authentication is enabled

2. **"No Calendars Found"**
   - Make sure your calendars are synced to iCloud
   - Check that calendars are not set to "Private" or "Hidden"
   - Verify iCloud Calendar sync is enabled on your devices

3. **"Connection Timeout"**
   - Check your internet connection
   - Try again later (iCloud services might be temporarily unavailable)
   - Verify firewall settings aren't blocking the connection

4. **"Events Not Syncing"**
   - Ensure events are within the sync time range (current month)
   - Check that events are not marked as private
   - Verify the calendar is shared/synced to iCloud

### Security Notes:

- **App-specific passwords** are more secure than your main Apple ID password
- **Never share** your app-specific password
- **Revoke access** by deleting the app-specific password if needed
- **Data is encrypted** in transit using HTTPS

## Advanced Configuration

### Custom CalDAV Server:

If you're using a different CalDAV server (not iCloud), you can configure:

```typescript
const caldavConfig = {
  serverUrl: 'https://your-caldav-server.com',
  username: 'your-username',
  password: 'your-password',
  calendarPath: '/calendars/'
};
```

### Sync Frequency:

By default, PolyHarmony syncs:
- **On connection**: Current month's events
- **Manual sync**: When you trigger a sync
- **Future enhancement**: Automatic periodic sync

## API Endpoints

### Sync Calendar:
```
POST /api/calendar/apple/sync
```

**Response:**
```json
{
  "message": "Successfully synced Apple Calendar",
  "calendarsFound": 3,
  "eventsProcessed": 45,
  "eventsSynced": 42
}
```

### Error Response:
```json
{
  "error": "Failed to sync Apple Calendar",
  "details": "Authentication failed"
}
```

## Support

If you encounter issues:

1. **Check this guide** for troubleshooting steps
2. **Verify your setup** matches the requirements
3. **Check the logs** for detailed error messages
4. **Contact support** with specific error details

## Privacy & Data

- **Your calendar data** is stored securely in your PolyHarmony database
- **No data is shared** with third parties
- **You control** what calendars and events are synced
- **You can disconnect** at any time from the settings page
