# MyOrbit: Application Specification (Polished main.md)

**Version:** 1.1
**Date:** October 11, 2025

---

## 1. Overview & Product Vision

MyOrbit is a sophisticated, consent‑aware calendar that simplifies scheduling across complex social networks. It is designed for everyone, with **specific support for polyamorous users**—prioritizing granular privacy, explicit consent, and intelligent automation. The app ships with a modern, mobile‑first UI (cyan→pink gradient) and full dark‑mode support.

**Core principles**

* Privacy‑first defaults; transparency is opted‑in, not forced.
* Explicitness overrides defaults (invites trump privacy levels; privacy levels trump partner permissions).
* Progressive disclosure and smart defaults to minimize cognitive load.

---

## 2. Application Architecture & App Flow

### 2.1 Primary Flow

1. Landing
2. Onboarding (8‑step)
3. Dashboard
4. Calendar (Month/Week/Day)
5. People
6. Activity
7. Settings
8. Updates & Guides

### 2.2 View States (`AppView`)

```ts
export type AppView =
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'calendar'
  | 'people'
  | 'activity'        // notifications + recent activity feed
  | 'events'          // event list & creation entry point
  | 'settings'
  | 'updates-guides';
```

### 2.3 Navigation

* **Bottom Tab Bar (primary):** Dashboard · Calendar · People · Activity
* **Header:** Gear icon opens Settings from top‑level views.
* **Dashboard Cards:** Events, Calendar, People & Groups, Settings, Updates & Guides, Recent Activity (quick actions: New Event, Add Partner)

---

## 3. Business Model

**Freemium** with “Privacy‑First, Anti‑Data‑Monetization” promise.

* **Free:** 1 external calendar sync; up to 3 Accepted Connections; full MVP feature set.
* **Pro (paid):** Unlimited Connections; unlimited external calendars.
* **Add‑on:** AI Assistant for automation (Pro users can enable via settings).

---

## 4. Authentication & Onboarding

### 4.1 Authentication Methods

* Google Sign‑In (OAuth)
* Apple Sign‑In (OAuth)
* Email + Password (24‑hour email verification required)

### 4.2 Profile & Identity

* **Preferred Name (Display Name)** collected (editable even with OAuth prefill).
* **Time Zone** auto‑detected then user‑confirmed.

### 4.3 Onboarding (8 Steps)

1. **Welcome** – intro & what will be set up.
2. **Connect Google Calendar** – OAuth (skippable).
3. **Calendar Sync** – progress animation; status.
4. **Add Partners** – optionally start now (skippable).
5. **Contact Permission** – request device contacts (skippable).
6. **Select Contacts** – multi‑select list.
7. **Invite Method** – Invite to app (becomes Pending) or Add as reference contact.
8. **Complete** – summary → Dashboard.

---

## 5. Relationships & Permissions

### 5.1 Partner States

* **Accepted (Connected):** On‑platform user who accepted; permissions active; counts toward free limit; badge: Green “Connected”.
* **Pending:** Invited but not accepted; does not count toward free limit; badge: Yellow “Pending”.
* **Contact‑Only:** Reference contact, off‑platform; no permissions; unlimited; badge: Gray “Contact Only”.
* **Upgrade Path:** Contact‑Only → (send invite) → Pending → Accepted.

### 5.2 Custom Labels

Private, free‑text labels for any Connection or Contact; system suggests labels based on usage.

### 5.3 Permission Model (3‑tier + per‑event override)

**Partner Permission Levels (defaults per Connection):**

* **Private** – sees nothing by default (default for new partners). Icon: EyeOff (red).
* **Semi‑Visible** – sees busy blocks only (no titles/descriptions). Icon: Clock (yellow).
* **Visible** – sees full details for all non‑private events. Icon: Eye (green).

**Event Privacy Levels (per‑event override):**

* **Normal** – respects partner permission levels. Icon: Users.
* **Exclusive** – only explicitly invited partners can see. Icon: Eye.
* **Super Exclusive** – invisible to everyone unless invited. Icon: Lock.

**Override hierarchy (highest → lowest):**

1. Explicit **event invitation** always grants full details.
2. **Event privacy** (Super Exclusive / Exclusive).
3. **Partner permission** (Visible / Semi‑Visible / Private).

**Availability Signal Permissions:**
* Unlike events, signals use explicit sharing - users select exactly which contacts can see each signal
* Signal sharing is independent of general contact permissions
* Each shared signal can have different notification and auto-accept settings per contact

**Examples:**

* Visible partner + Exclusive event + not invited → cannot see it.
* Private partner + invited → sees full details.
* Semi‑Visible partner + Normal event → sees busy‑only.
* Signal created + explicitly shared with Contact A but not Contact B → Contact A sees signal, Contact B does not.

---

## 6. Core Features

### 6.1 Event Management

**Creation entry points:**

* Dashboard “New Event” button
* Calendar schedule card “+” button
* Long‑press (800ms) on date in Month View
* Events page header button
* Quick event creation from dashboard

**Event modal fields:** Title (req), Description, Calendar selection, Date, Start/End, Recurrence pattern (One-off, Weekly, Biweekly, Monthly), Invite Accepted partners (toggles show their permission icon), Privacy Level dropdown (progressive disclosure with detailed descriptions), Buffer settings for signal conflicts.

**Advanced Event Features:**
* **Smart Recurrence:** Weekly, biweekly, and monthly patterns with AI-powered suggestions based on usage patterns
* **Conflict Detection:** Automatic detection of conflicts with availability signals, with intelligent resolution options
* **Multi-calendar Support:** Events can be assigned to different calendars with visibility toggling
* **Buffer Management:** Configurable time buffers to protect availability signals from event scheduling

**Actions:** Update · Delete (Confirmation Dialog) · Cancel (Confirmation Dialog)

### 6.2 Confirmation Dialogs (Destructive/High‑impact)

* **Delete / Cancel Event:** shows title; mentions attendee notifications if present. Optional toggles: (a) **Set reminder to reschedule** (nudge via text) and (b) **Auto‑reschedule** (AI texts attendees for availability; can auto‑book based on preferences). Messaging reflects choices (e.g., “Event canceled – reminder set”).
* **Permission Change:** confirms partner + new level; warns about visibility implications.
* **Remove Partner:** confirms removal; existing events remain on calendar; partner association removed.

### 6.3 AI Assistant & Automation (Add‑on)

* **Auto‑Rescheduling:** When canceling, AI can text attendees for new times and auto‑book within constraints.
* **Auto‑Cancellation Alerts:** AI can send SMS to attendees upon cancellation.
* **Reschedule Nudges:** Time‑boxed reminders to follow up via text.

### 6.4 Availability Signals (Proactive Layer)

**Goal:** Proactively broadcast availability as a separate calendar layer, per‑Connection, with sophisticated conflict management.

**Signal Types** (4 distinct states)
* **Available:** Indicate you're free and available to connect or meet up.
* **Busy:** Indicate you're occupied and not available right now.
* **Flexible:** Indicate you might be available depending on the activity.
* **Unavailable:** Explicitly indicate you're unavailable and shouldn't be contacted.

**Signal Creation & Sharing Workflow**

1. **3-step flow:** Select Connections → Set Preferences (notifications/auto-accept) → Schedule Time Window
2. Choose which **Accepted** Connections can see the signal (Contact-Only excluded)
3. Per-Connection customization: **Notification** (push/in-app/SMS) and **Auto-accept** settings
4. Schedule: Start/end times, optional message/notes, recurrence patterns, buffer settings

**Signal Conflict Management**

* **Automatic Detection:** When creating an event during active signal times, system detects conflicts
* **Smart Buffer System:** Configurable buffers (0, 30, 60, 120 minutes) automatically apply around events
* **Resolution Options:** When conflicts occur - Cancel signal, Trim signal around event, or Abort creation
* **Recurrence Intelligence:** For recurring events, system intelligently handles repeated conflicts

**Signal Consumption & Automation**

* When a confirmed event overlaps a Signal, the overlapped portion is automatically handled based on buffer settings
* **Confirmation modals** offer intelligent options: trim signal around event time or cancel portions
* **Automation settings:** Configurable default behaviors for conflict resolution
* **Smart Suggestions:** AI-powered recurrence suggestions based on past signal patterns

---

## 7. UI/UX Details

### 7.1 Calendar Modes

* **Month:** 5‑week grid, event dots (max 2 then “+”); today highlighted with orange→pink gradient; availability signals shown as pulsating dots; long‑press to create (800ms).
* **Week:** 7‑day horizontal layout with event bars and signal indicators; shows buffer zones around events.
* **Day:** Large date header with detailed schedule below, including availability signals and buffer visualization.
* **Multi-Calendar Support:** Visual indicators for different calendars with color coding; toggle visibility of individual calendars.

### 7.2 Design System & Principles

* **Dark Mode:** Toggle in Settings → Appearance; pure‑black background; dark‑gray cards; Tailwind utilities with dark variants.
* **Progressive Disclosure:** Advanced privacy/permission controls collapsed by default.
* **Smart Defaults:** New partners start **Private**; new events default to **Normal** and current date.
* **Color System:** 10‑color partner palette applied consistently (avatars, event indicators).

### 7.3 Notification System

**Default channels (high‑level):**

* New event invitation → **Push** (primary), **Email** (secondary)
* Event accepted → **In‑App** (tray)
* Event canceled → **Push** (primary), **Email** (secondary)
* “Send Notification” Signal → **Push** (with channel configurable per signal)
* Connection request accepted → **In‑App**
* AI reschedule suggestion → **Push** with actions
* Availability signal conflicts → **In-App** with resolution options

**Advanced Settings:**
* **Signal Notification Channels:** Configurable per signal (Push, In-app, SMS)
* **Event Buffers:** Configurable buffers (0-120 minutes) around events to protect signals
* **Time Zone Management:** User-configurable time zones with automatic abbreviation display
* **Calendar-Specific Notifications:** Per-calendar notification preferences

**Philosophy for launch**

* **Reliability & Real‑time:** FCM/APNs + Google Calendar webhooks; avoid polling.
* **Urgency‑aware:** Use push for time‑critical items; keep persistent record in Notification Center.
* **Customization:** Per‑feature, per‑channel toggles in Settings with signal-specific preferences.

---

## 8. Implementation Notes (Engineering)

### 8.1 Integrations (MVP targets)

* **Google Calendar API:** OAuth; initial import + real‑time sync.
* **SMS:** Twilio (or equivalent) for AI rescheduling and alerts.
* **Push:** FCM (Android/web), APNs (iOS).

### 8.2 Backend & Data

* **Auth:** OAuth + email/password; JWT/session management.
* **Data:** Encrypt sensitive calendar data; per‑tenant isolation.
* **Realtime:** WebSocket for live updates; background jobs for reminders.
* **Invitations:** Email/SMS deep links to accept/connect.

### 8.3 Storage Models (illustrative)

```ts
// Event
{
  id: string,
  title: string,
  description?: string,
  start: string, // ISO
  end: string,   // ISO
  privacyLevel: 'normal' | 'exclusive' | 'super-exclusive',
  invitedPartnerIds: string[] // explicit invite → full details
}

// Partner relationship
{
  partnerId: string,
  permissions: 'private' | 'semi-visible' | 'visible',
  status: 'pending' | 'accepted' | 'contact-only'
}
```

### 8.4 Visibility Calculation (reference)

```ts
function canSeeEvent(event: Event, partner: PartnerRel) {
  // 1) Explicit invitation wins
  if (event.invitedPartnerIds.includes(partner.partnerId)) {
    return { visible: true, details: 'full' };
  }
  // 2) Event privacy overrides
  if (event.privacyLevel === 'super-exclusive' || event.privacyLevel === 'exclusive') {
    return { visible: false, details: 'none' };
  }
  // 3) Partner default permissions
  switch (partner.permissions) {
    case 'visible':      return { visible: true, details: 'full' };
    case 'semi-visible': return { visible: true, details: 'busy-only' };
    default:             return { visible: false, details: 'none' };
  }
}
```

---

## 9. Security & Privacy

* End‑to‑end encryption for sensitive calendar payloads at rest and in transit.
* Scope‑limited tokens for external APIs; rotate regularly.
* Least‑privilege access for services; audit logging for consent‑affecting actions.

---

## 10. Open Questions (for Founder Sign‑off)

1. **Platforms for MVP:** iOS, Android, Web? (affects tech stack and push).
2. **SMS Provider Preference:** Twilio OK? Any constraints (cost, region)?
3. **Data Residency/Compliance:** Any requirements (e.g., GDPR, SOC2 timeline)?
4. **Invite Channels:** Email only, SMS only, or both for MVP?
5. **AI Budget Guardrails:** Daily/weekly cap for automation texts and scheduling?

---

## 11. Glossary

* **Connection (Accepted):** On‑platform partner with active permissions.
* **Pending:** Invited user not yet on platform.
* **Contact‑Only:** Off‑platform reference; no permissions.
* **Signal:** A shared availability block that can auto‑confirm invites.
* **Notification Center:** In‑app tray of persistent notifications.
