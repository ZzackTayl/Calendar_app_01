# Offline-First Architecture Design

## Overview

This document outlines the transition from demo mode to a true offline-first architecture for authenticated users. Users will be able to use the application without internet connection once they have an active account, with changes synchronized when connectivity is restored.

## Architecture Principles

### 1. **Authenticated-Only Offline Access**
- Only authenticated users with verified accounts can access offline functionality
- No more demo/guest modes - users must have a valid account
- Session persistence allows continued access during temporary connectivity loss

### 2. **Progressive Web App (PWA) Infrastructure**
- Service Worker for offline caching and request management
- App Manifest for installable app experience
- Background sync for data synchronization
- Cache-first strategy for UI assets, Network-first for data

### 3. **Tiered Storage Strategy**
```
┌─────────────────┐
│   Supabase      │ ← Primary (online)
│   (Remote)      │
└─────────────────┘
         ↕ sync
┌─────────────────┐
│   IndexedDB     │ ← Secondary (offline cache)
│   (Local)       │
└─────────────────┘
         ↕ fallback
┌─────────────────┐
│   Memory Cache  │ ← Tertiary (session)
│   (Runtime)     │
└─────────────────┘
```

## Technical Implementation

### 1. **Storage Layer (`lib/offline-store.ts`)**
Replace `lib/demo-store.ts` with comprehensive offline storage:

```typescript
interface OfflineStore {
  // Data management
  syncUserData(userId: string): Promise<void>
  cacheUserData(userId: string, data: UserData): Promise<void>
  getUserData(userId: string): Promise<UserData | null>
  
  // Offline operations
  addOfflineChange(change: OfflineChange): Promise<void>
  getPendingSyncChanges(userId: string): Promise<OfflineChange[]>
  markChangeSynced(changeId: string): Promise<void>
  
  // Connectivity management
  isOnline(): boolean
  onConnectivityChange(callback: (isOnline: boolean) => void): void
}
```

### 2. **Sync Manager (`lib/sync/sync-manager.ts`)**
Handle data synchronization between local and remote storage:

```typescript
interface SyncManager {
  // Sync operations
  syncUp(userId: string): Promise<SyncResult>
  syncDown(userId: string): Promise<SyncResult>
  resolveConflicts(conflicts: DataConflict[]): Promise<void>
  
  // Background sync
  scheduleBackgroundSync(): void
  onBackgroundSync(callback: () => Promise<void>): void
}
```

### 3. **PWA Service Worker (`public/sw.js`)**
- Cache static assets (HTML, CSS, JS)
- Implement cache-first strategy for UI
- Handle offline API requests
- Background sync registration
- Push notification support

### 4. **Connection Manager (`lib/connection/connection-manager.ts`)**
- Monitor online/offline status
- Queue operations during offline periods
- Trigger sync when connection restored
- Handle retry logic with exponential backoff

## Data Flow

### Online Mode (Default)
1. User performs action (create event, update relationship)
2. Data sent directly to Supabase
3. Success response triggers local cache update
4. UI updated with confirmation

### Offline Mode 
1. User performs action while offline
2. Data stored in IndexedDB with "pending_sync" status
3. UI updated optimistically 
4. Change queued for sync when online
5. Background sync attempts when connectivity restored

### Sync Process
1. Detect connectivity restoration
2. Fetch latest server state for user
3. Compare with local pending changes
4. Resolve conflicts (last-write-wins or user prompt)
5. Push local changes to server
6. Update local cache with server response
7. Mark changes as synced

## Migration Strategy

### Phase 1: Remove Demo Mode
- Remove all demo-related code and references
- Remove demo-related middleware logic
- Update UI to require authentication

### Phase 2: Implement Offline Infrastructure
- Create IndexedDB storage layer
- Implement connection monitoring
- Set up PWA service worker
- Create sync manager foundation

### Phase 3: Enable Offline Operations
- Update auth context to support offline mode
- Modify data hooks to work offline
- Implement optimistic updates
- Add sync status indicators to UI

### Phase 4: Background Sync & Polish
- Implement background sync
- Add conflict resolution
- Optimize sync performance
- Add comprehensive error handling

## Security Considerations

### 1. **Local Data Encryption**
- Encrypt sensitive data in IndexedDB
- Use user session key for encryption
- Clear encryption keys on sign out

### 2. **Sync Authentication**
- Validate session before sync operations
- Use refresh tokens for background sync
- Implement sync rate limiting

### 3. **Conflict Resolution**
- Maintain audit trail for conflicts
- Preserve user privacy during sync
- Handle concurrent modification detection

## Performance Optimizations

### 1. **Selective Sync**
- Only sync data within date ranges
- Prioritize recently accessed data
- Implement incremental sync

### 2. **Compression**
- Compress sync payloads
- Use delta sync for large datasets
- Batch multiple changes

### 3. **Caching Strategy**
- Cache frequently accessed data
- Implement smart prefetching
- Use memory cache for hot data

## User Experience

### 1. **Offline Indicators**
- Clear online/offline status
- Sync progress indicators
- Pending changes count
- Connection quality hints

### 2. **Conflict Resolution**
- User-friendly conflict dialogs
- Show diff of conflicting changes
- Allow user to choose resolution
- Maintain change history

### 3. **Performance Feedback**
- Loading states during sync
- Success/error notifications
- Sync completion confirmations
- Background sync notifications

## File Structure Changes

```
lib/
├── offline/
│   ├── offline-store.ts      # IndexedDB storage layer
│   ├── connection-manager.ts  # Network connectivity
│   ├── sync-manager.ts       # Data synchronization
│   └── conflict-resolver.ts   # Handle data conflicts
├── hooks/
│   ├── use-offline-data.ts   # Offline data access
│   ├── use-sync-status.ts    # Sync status monitoring
│   └── use-connection.ts     # Connection monitoring
└── components/
    ├── sync-status.tsx       # Sync status indicator
    └── offline-banner.tsx    # Offline mode banner

public/
├── sw.js                     # Service worker
├── manifest.json            # PWA manifest
└── offline.html             # Offline fallback page
```

## Dependencies

### New Dependencies
```json
{
  "idb": "^7.1.1",              // IndexedDB wrapper
  "workbox-webpack-plugin": "^6.5.4", // Service worker
  "workbox-strategies": "^6.5.4"      // Cache strategies
}
```

### Scripts Updates
- Remove all demo-related scripts
- Add PWA build scripts
- Add offline testing scripts
- Update validation scripts

This architecture provides a robust offline-first experience while maintaining security and data integrity, replacing the current demo mode with a proper authenticated offline solution.
