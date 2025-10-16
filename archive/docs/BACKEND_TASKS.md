## Backend Follow-Up Log

Use this list to coordinate with the backend team once we shift from mock data to real services. Each item includes the “why” so we keep product intent clear.

### Availability Signals
- **Signals API (CRUD):** `POST /signals`, `GET /signals/active`, `PATCH /signals/{id}`, `DELETE /signals/{id}`  
  *Why:* Persist user availability windows, respect keep-alive vs. explicit end times, and let users cancel from any device.
- **Signal sharing API:** `POST /signals/{id}/share`, `GET /signals/shared-with-me`  
  *Why:* Scope visibility to selected partners, store per-partner notify / auto-accept preferences, and feed partner views.
- **Conflict resolution hook:** Endpoint or job to adjust/cancel signals automatically when events overlap (mirrors front-end warning).  
  *Why:* Keeps signals consistent across devices once the front end trims/cancels locally.

### Notifications & Preferences
- **Notification channel preferences endpoint:** Read/write per-user settings for signal alerts (push / in-app / SMS).  
  *Why:* Front end now exposes channel selection; server must respect it when dispatching notifications.
- **Activity + dashboard badges:** Ensure backend-broadcasted signals generate in-app notifications even when push/SMS are disabled.  
  *Why:* Users should still see alerts inside the app when external channels are muted.
- **SMS delivery integration:** Queue outgoing messages when channel preference is SMS.  
  *Why:* Required for partners who opt into SMS notifications instead of push.

### Data Synchronization
- **Signal overlap reconciliation:** Endpoint or background worker to finalize signal trimming or cancellation after an event is created.  
  *Why:* Front end currently performs client-side adjustments; server needs a source of truth to keep other clients in sync.
- **Audit trail / history storage:** Persist expired or cancelled signals for future reporting.  
  *Why:* Product spec references past availability; storing history now avoids migration later.

### General
- **Auth-aware RLS policies for signals & shares.**  
  *Why:* Ensure users only see their own signals and those explicitly shared with them.
- **Error/validation surfaces:** Standardize error codes for the front end (e.g., overlapping signal rejection, invalid duration).  
  *Why:* Keeps user messaging consistent and debuggable.

> Keep this document updated as new dependencies emerge so backend and frontend roadmaps stay aligned.

