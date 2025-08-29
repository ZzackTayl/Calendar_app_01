# PolyHarmony Calendar App - API Endpoints Reference

## Overview
This document serves as a reference for the PolyHarmony Calendar App API endpoints, documenting the available routes, methods, parameters, and responses.

## Base URL
```
/api
```

## Authentication
Most API endpoints require authentication via Supabase Auth. Authenticated requests should include a valid access token in the Authorization header.

## Account Management

### Delete Account
- **Endpoint**: `/api/account/delete`
- **Method**: POST
- **Description**: Permanently delete user account and all associated data
- **Authentication**: Required
- **Request Body**: None
- **Responses**:
  - 200: Account successfully deleted
  - 401: Unauthorized
  - 500: Server error

## Authentication

### Apple Authentication
- **Endpoint**: `/api/auth/apple`
- **Method**: POST
- **Description**: Authenticate with Apple ID
- **Authentication**: Not required
- **Request Body**: Apple authentication credentials
- **Responses**:
  - 200: Authentication successful
  - 400: Invalid credentials
  - 500: Server error

### Google Authentication
- **Endpoint**: `/api/auth/google`
- **Method**: POST
- **Description**: Authenticate with Google account
- **Authentication**: Not required
- **Request Body**: Google authentication credentials
- **Responses**:
  - 200: Authentication successful
  - 400: Invalid credentials
  - 500: Server error

## Calendar Integration

### Apple Calendar Sync
- **Endpoint**: `/api/calendar/apple/sync`
- **Method**: POST
- **Description**: Sync events with Apple Calendar
- **Authentication**: Required
- **Request Body**: Sync parameters
- **Responses**:
  - 200: Sync successful
  - 401: Unauthorized
  - 500: Sync error

### Calendar Export
- **Endpoint**: `/api/calendar/export`
- **Method**: GET
- **Description**: Export calendar events in iCal format
- **Authentication**: Required
- **Query Parameters**: 
  - `start_date` (optional): Start date for export
  - `end_date` (optional): End date for export
- **Responses**:
  - 200: iCal file download
  - 401: Unauthorized
  - 500: Export error

### Google Calendar Sync
- **Endpoint**: `/api/calendar/google/sync`
- **Method**: POST
- **Description**: Sync events with Google Calendar
- **Authentication**: Required
- **Request Body**: Sync parameters
- **Responses**:
  - 200: Sync successful
  - 401: Unauthorized
  - 500: Sync error

### Calendar Import
- **Endpoint**: `/api/calendar/import`
- **Method**: POST
- **Description**: Import events from iCal file
- **Authentication**: Required
- **Request Body**: iCal file
- **Responses**:
  - 200: Import successful
  - 400: Invalid file format
  - 401: Unauthorized
  - 500: Import error

### OAuth Callback
- **Endpoint**: `/api/calendar/oauth/callback`
- **Method**: GET
- **Description**: Handle OAuth callback from calendar providers
- **Authentication**: Not required (OAuth flow)
- **Query Parameters**: OAuth callback parameters
- **Responses**:
  - 302: Redirect to calendar settings
  - 400: OAuth error
  - 500: Server error

### OAuth Setup
- **Endpoint**: `/api/calendar/oauth/setup`
- **Method**: POST
- **Description**: Initiate OAuth flow for calendar integration
- **Authentication**: Required
- **Request Body**: Provider and setup parameters
- **Responses**:
  - 200: OAuth URL for redirect
  - 401: Unauthorized
  - 500: Setup error

## Contacts Management

### List Contacts
- **Endpoint**: `/api/contacts`
- **Method**: GET
- **Description**: Get all contacts for the authenticated user
- **Authentication**: Required
- **Query Parameters**: 
  - `limit` (optional): Number of contacts to return
  - `offset` (optional): Offset for pagination
- **Responses**:
  - 200: Array of contacts
  - 401: Unauthorized
  - 500: Server error

### Create Contact
- **Endpoint**: `/api/contacts`
- **Method**: POST
- **Description**: Create a new contact
- **Authentication**: Required
- **Request Body**: Contact details
- **Responses**:
  - 201: Contact created successfully
  - 400: Invalid contact data
  - 401: Unauthorized
  - 500: Server error

### Get Contact
- **Endpoint**: `/api/contacts/[id]`
- **Method**: GET
- **Description**: Get a specific contact by ID
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Contact ID
- **Responses**:
  - 200: Contact details
  - 401: Unauthorized
  - 404: Contact not found
  - 500: Server error

### Update Contact
- **Endpoint**: `/api/contacts/[id]`
- **Method**: PUT
- **Description**: Update a specific contact
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Contact ID
- **Request Body**: Updated contact details
- **Responses**:
  - 200: Contact updated successfully
  - 400: Invalid contact data
  - 401: Unauthorized
  - 404: Contact not found
  - 500: Server error

### Delete Contact
- **Endpoint**: `/api/contacts/[id]`
- **Method**: DELETE
- **Description**: Delete a specific contact
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Contact ID
- **Responses**:
  - 204: Contact deleted successfully
  - 401: Unauthorized
  - 404: Contact not found
  - 500: Server error

### Import Contacts
- **Endpoint**: `/api/contacts/import`
- **Method**: POST
- **Description**: Import contacts from a file
- **Authentication**: Required
- **Request Body**: Contact file (CSV, vCard, etc.)
- **Responses**:
  - 200: Import successful
  - 400: Invalid file format
  - 401: Unauthorized
  - 500: Import error

## Events Management

### List Events
- **Endpoint**: `/api/events`
- **Method**: GET
- **Description**: Get all events for the authenticated user
- **Authentication**: Required
- **Query Parameters**: 
  - `start_date` (optional): Start date filter
  - `end_date` (optional): End date filter
  - `limit` (optional): Number of events to return
  - `offset` (optional): Offset for pagination
- **Responses**:
  - 200: Array of events
  - 401: Unauthorized
  - 500: Server error

### Create Event
- **Endpoint**: `/api/events`
- **Method**: POST
- **Description**: Create a new event
- **Authentication**: Required
- **Request Body**: Event details
- **Responses**:
  - 201: Event created successfully
  - 400: Invalid event data
  - 401: Unauthorized
  - 500: Server error

### Get Event
- **Endpoint**: `/api/events/[id]`
- **Method**: GET
- **Description**: Get a specific event by ID
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Event ID
- **Responses**:
  - 200: Event details
  - 401: Unauthorized
  - 404: Event not found
  - 500: Server error

### Update Event
- **Endpoint**: `/api/events/[id]`
- **Method**: PUT
- **Description**: Update a specific event
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Event ID
- **Request Body**: Updated event details
- **Responses**:
  - 200: Event updated successfully
  - 400: Invalid event data
  - 401: Unauthorized
  - 404: Event not found
  - 500: Server error

### Delete Event
- **Endpoint**: `/api/events/[id]`
- **Method**: DELETE
- **Description**: Delete a specific event
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Event ID
- **Responses**:
  - 204: Event deleted successfully
  - 401: Unauthorized
  - 404: Event not found
  - 500: Server error

### Check Conflicts
- **Endpoint**: `/api/events/check-conflicts`
- **Method**: POST
- **Description**: Check for scheduling conflicts
- **Authentication**: Required
- **Request Body**: Event time range and participants
- **Responses**:
  - 200: Conflict check results
  - 400: Invalid request data
  - 401: Unauthorized
  - 500: Server error

### Create Event from Template
- **Endpoint**: `/api/events/from-template/[id]`
- **Method**: POST
- **Description**: Create a new event based on a template
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Template ID
- **Request Body**: Event details (time, date, etc.)
- **Responses**:
  - 201: Event created successfully
  - 400: Invalid event data
  - 401: Unauthorized
  - 404: Template not found
  - 500: Server error

### Parse Natural Language
- **Endpoint**: `/api/events/parse-natural`
- **Method**: POST
- **Description**: Parse natural language into event details
- **Authentication**: Required
- **Request Body**: Natural language text
- **Responses**:
  - 200: Parsed event details
  - 400: Unable to parse text
  - 401: Unauthorized
  - 500: Server error

## Groups Management

### Get Group
- **Endpoint**: `/api/groups/[groupId]`
- **Method**: GET
- **Description**: Get a specific group by ID
- **Authentication**: Required
- **Path Parameters**: 
  - `groupId`: Group ID
- **Responses**:
  - 200: Group details
  - 401: Unauthorized
  - 404: Group not found
  - 500: Server error

### Update Group
- **Endpoint**: `/api/groups/[groupId]`
- **Method**: PUT
- **Description**: Update a specific group
- **Authentication**: Required
- **Path Parameters**: 
  - `groupId`: Group ID
- **Request Body**: Updated group details
- **Responses**:
  - 200: Group updated successfully
  - 400: Invalid group data
  - 401: Unauthorized
  - 404: Group not found
  - 500: Server error

### Delete Group
- **Endpoint**: `/api/groups/[groupId]`
- **Method**: DELETE
- **Description**: Delete a specific group
- **Authentication**: Required
- **Path Parameters**: 
  - `groupId`: Group ID
- **Responses**:
  - 204: Group deleted successfully
  - 401: Unauthorized
  - 404: Group not found
  - 500: Server error

### Group Members Management

#### Add Member to Group
- **Endpoint**: `/api/groups/[groupId]/members/[userId]`
- **Method**: POST
- **Description**: Add a member to a group
- **Authentication**: Required
- **Path Parameters**: 
  - `groupId`: Group ID
  - `userId`: User ID to add
- **Request Body**: Member details (role, permissions)
- **Responses**:
  - 201: Member added successfully
  - 400: Invalid member data
  - 401: Unauthorized
  - 404: Group or user not found
  - 500: Server error

#### Remove Member from Group
- **Endpoint**: `/api/groups/[groupId]/members/[userId]`
- **Method**: DELETE
- **Description**: Remove a member from a group
- **Authentication**: Required
- **Path Parameters**: 
  - `groupId`: Group ID
  - `userId`: User ID to remove
- **Responses**:
  - 204: Member removed successfully
  - 401: Unauthorized
  - 404: Group or member not found
  - 500: Server error

### Group Invitations

#### Accept Group Invitation
- **Endpoint**: `/api/groups/invitations/accept`
- **Method**: POST
- **Description**: Accept a group invitation
- **Authentication**: Required
- **Request Body**: Invitation details
- **Responses**:
  - 200: Invitation accepted
  - 400: Invalid invitation
  - 401: Unauthorized
  - 404: Invitation not found
  - 500: Server error

#### Create Group Invitation
- **Endpoint**: `/api/groups/invitations/create`
- **Method**: POST
- **Description**: Create a new group invitation
- **Authentication**: Required
- **Request Body**: Invitation details
- **Responses**:
  - 201: Invitation created
  - 400: Invalid invitation data
  - 401: Unauthorized
  - 500: Server error

#### Get Pending Group Invitations
- **Endpoint**: `/api/groups/invitations/pending`
- **Method**: GET
- **Description**: Get pending group invitations for the user
- **Authentication**: Required
- **Responses**:
  - 200: Array of pending invitations
  - 401: Unauthorized
  - 500: Server error

## Health Check

### System Health
- **Endpoint**: `/api/health`
- **Method**: GET
- **Description**: Check system health status
- **Authentication**: Not required
- **Responses**:
  - 200: System is healthy
  - 500: System is unhealthy

## Invitations Management

### Accept Invitation
- **Endpoint**: `/api/invitations/accept`
- **Method**: POST
- **Description**: Accept an invitation
- **Authentication**: Required
- **Request Body**: Invitation acceptance details
- **Responses**:
  - 200: Invitation accepted
  - 400: Invalid invitation
  - 401: Unauthorized
  - 404: Invitation not found
  - 500: Server error

### Accept Invitation by Token
- **Endpoint**: `/api/invitations/accept/[token]`
- **Method**: GET
- **Description**: Accept an invitation using a token
- **Authentication**: Not required (token-based)
- **Path Parameters**: 
  - `token`: Invitation token
- **Responses**:
  - 200: Invitation accepted
  - 400: Invalid token
  - 404: Invitation not found
  - 500: Server error

### Cleanup Expired Invitations
- **Endpoint**: `/api/invitations/cleanup`
- **Method**: POST
- **Description**: Clean up expired invitations
- **Authentication**: Required (admin)
- **Responses**:
  - 200: Cleanup successful
  - 401: Unauthorized
  - 403: Forbidden
  - 500: Server error

### Create Invitation
- **Endpoint**: `/api/invitations/create`
- **Method**: POST
- **Description**: Create a new invitation
- **Authentication**: Required
- **Request Body**: Invitation details
- **Responses**:
  - 201: Invitation created
  - 400: Invalid invitation data
  - 401: Unauthorized
  - 500: Server error

### Decline Invitation
- **Endpoint**: `/api/invitations/decline/[token]`
- **Method**: GET
- **Description**: Decline an invitation using a token
- **Authentication**: Not required (token-based)
- **Path Parameters**: 
  - `token`: Invitation token
- **Responses**:
  - 200: Invitation declined
  - 400: Invalid token
  - 404: Invitation not found
  - 500: Server error

### Get Invitation Details
- **Endpoint**: `/api/invitations/details/[token]`
- **Method**: GET
- **Description**: Get details of an invitation by token
- **Authentication**: Not required (token-based)
- **Path Parameters**: 
  - `token`: Invitation token
- **Responses**:
  - 200: Invitation details
  - 400: Invalid token
  - 404: Invitation not found
  - 500: Server error

### Get Pending Invitations
- **Endpoint**: `/api/invitations/pending`
- **Method**: GET
- **Description**: Get pending invitations for the user
- **Authentication**: Required
- **Responses**:
  - 200: Array of pending invitations
  - 401: Unauthorized
  - 500: Server error

### Validate Invitation Token
- **Endpoint**: `/api/invitations/validate/[token]`
- **Method**: GET
- **Description**: Validate an invitation token
- **Authentication**: Not required (token-based)
- **Path Parameters**: 
  - `token`: Invitation token
- **Responses**:
  - 200: Token is valid
  - 400: Invalid token
  - 404: Invitation not found
  - 500: Server error

## Monitoring

### Monitoring Dashboard
- **Endpoint**: `/api/monitoring/dashboard`
- **Method**: GET
- **Description**: Get monitoring dashboard data
- **Authentication**: Required (admin)
- **Responses**:
  - 200: Dashboard data
  - 401: Unauthorized
  - 403: Forbidden
  - 500: Server error

## Onboarding

### Complete Onboarding
- **Endpoint**: `/api/onboarding/complete`
- **Method**: POST
- **Description**: Mark onboarding as complete for the user
- **Authentication**: Required
- **Request Body**: Onboarding completion data
- **Responses**:
  - 200: Onboarding completed
  - 400: Invalid data
  - 401: Unauthorized
  - 500: Server error

### Get Onboarding Status
- **Endpoint**: `/api/onboarding`
- **Method**: GET
- **Description**: Get onboarding status for the user
- **Authentication**: Required
- **Responses**:
  - 200: Onboarding status
  - 401: Unauthorized
  - 500: Server error

## Sharing

### Create Share
- **Endpoint**: `/api/sharing`
- **Method**: POST
- **Description**: Create a new calendar share
- **Authentication**: Required
- **Request Body**: Share details
- **Responses**:
  - 201: Share created
  - 400: Invalid share data
  - 401: Unauthorized
  - 500: Server error

### Get Share
- **Endpoint**: `/api/sharing/[id]`
- **Method**: GET
- **Description**: Get a specific share by ID
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Share ID
- **Responses**:
  - 200: Share details
  - 401: Unauthorized
  - 404: Share not found
  - 500: Server error

### Delete Share
- **Endpoint**: `/api/sharing/[id]`
- **Method**: DELETE
- **Description**: Delete a specific share
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Share ID
- **Responses**:
  - 204: Share deleted
  - 401: Unauthorized
  - 404: Share not found
  - 500: Server error

### Create Share Token
- **Endpoint**: `/api/sharing/token`
- **Method**: POST
- **Description**: Create a share token for access
- **Authentication**: Required
- **Request Body**: Token creation parameters
- **Responses**:
  - 201: Token created
  - 400: Invalid parameters
  - 401: Unauthorized
  - 500: Server error

## Templates

### List Templates
- **Endpoint**: `/api/templates`
- **Method**: GET
- **Description**: Get all event templates for the user
- **Authentication**: Required
- **Responses**:
  - 200: Array of templates
  - 401: Unauthorized
  - 500: Server error

### Create Template
- **Endpoint**: `/api/templates`
- **Method**: POST
- **Description**: Create a new event template
- **Authentication**: Required
- **Request Body**: Template details
- **Responses**:
  - 201: Template created
  - 400: Invalid template data
  - 401: Unauthorized
  - 500: Server error

### Get Template
- **Endpoint**: `/api/templates/[id]`
- **Method**: GET
- **Description**: Get a specific template by ID
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Template ID
- **Responses**:
  - 200: Template details
  - 401: Unauthorized
  - 404: Template not found
  - 500: Server error

### Update Template
- **Endpoint**: `/api/templates/[id]`
- **Method**: PUT
- **Description**: Update a specific template
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Template ID
- **Request Body**: Updated template details
- **Responses**:
  - 200: Template updated
  - 400: Invalid template data
  - 401: Unauthorized
  - 404: Template not found
  - 500: Server error

### Delete Template
- **Endpoint**: `/api/templates/[id]`
- **Method**: DELETE
- **Description**: Delete a specific template
- **Authentication**: Required
- **Path Parameters**: 
  - `id`: Template ID
- **Responses**:
  - 204: Template deleted
  - 401: Unauthorized
  - 404: Template not found
  - 500: Server error

## Error Responses

### Common Error Codes
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "message": "Human-readable error description"
}
```

## Success Responses

### Common Success Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no content to return

### Success Response Format
```json
{
  "success": true,
  "data": { /* Response data */ },
  "message": "Success message"
}
```

## Rate Limiting
API endpoints are rate-limited to prevent abuse:
- 100 requests per minute per IP for unauthenticated requests
- 1000 requests per minute per user for authenticated requests

## CORS Policy
The API allows CORS requests from the application's domain and whitelisted domains.

## Versioning
The API is currently at version 1. Breaking changes will result in a new version path (e.g., `/api/v2`).

---

*Last Updated: August 29, 2025*
*Repository Inspector: API Endpoints Reference v1.0*