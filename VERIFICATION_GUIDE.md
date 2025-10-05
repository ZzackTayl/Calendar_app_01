# Frontend Issues - Verification & Testing Guide
**For Non-Technical Review**

This guide will help you test each issue yourself to verify it's real, understand what's broken, and why it matters.

---

## 🎯 How to Use This Guide

For each issue below:
1. **Read "What Should Happen"** - The expected behavior
2. **Follow "How to Test"** - Step-by-step instructions
3. **Check "What Actually Happens"** - The bug/problem
4. **Read "Why This Matters"** - Impact on users
5. **Review "The Fix Explained"** - What needs to be built

---

## 🔴 CRITICAL ISSUE #1: Onboarding Step 6 - Contact Selection

### 📍 Where to Find It
- Open the app
- Go through onboarding (or navigate to it)
- Progress to Step 6 of 8 (75% through)

### ✅ What SHOULD Happen
When you reach Step 6, you should see:
- A list of contacts from your phone
- Each contact shown as a card with their name and photo
- Checkboxes or tap-to-select functionality
- Ability to search/filter contacts
- Selected contacts highlighted
- "Continue" button that takes you to Step 7

**Think of it like:** When you're adding friends on Facebook - you see a list of people you can choose from.

### ❌ What ACTUALLY Happens
Instead, you see:
- A simple screen with just text
- "Select Contacts" as a title
- "Step 6: Contact selection screen (To be implemented)"
- No actual contacts shown
- No way to select anyone
- The screen is basically empty/placeholder

### 🧪 How to Test This Yourself

**Option A: Run the app and go through onboarding**
```bash
# In your terminal:
cd /Users/zackstewart/Documents/GitHub/calendar_app
flutter run -d chrome
```
Then:
1. Click through the landing page
2. Start onboarding
3. Progress through Steps 1-5
4. When you reach Step 6, you'll see the placeholder

**Option B: Look at the code**
- Open: `lib/screens/onboarding_screen.dart`
- Search for: `_buildContactSelectionStep`
- You'll see it's just a placeholder with text

### 💥 Why This Matters

**User Impact:**
- The onboarding flow is broken - users can't complete setup properly
- Users expect to select their partners from contacts but can't
- Creates confusion and looks unfinished
- Users might abandon the app thinking it's broken

**Business Impact:**
- First impression is "this app isn't ready"
- Can't launch to users with this incomplete
- Blocks the entire onboarding experience

### 🔧 The Fix Explained (In Simple Terms)

**What needs to be built:**

Imagine you're building a contact picker like in your phone's messaging app. You need:

1. **Get the contacts** - Ask the phone for the user's contact list
2. **Show them nicely** - Display each contact as a card with their name
3. **Make them selectable** - Let users tap to select/deselect
4. **Remember selections** - Keep track of who they picked
5. **Pass them forward** - Send the selected contacts to the next step

**The technical work:**
- Connect to the phone's contact database
- Create scrollable list of contact cards
- Add selection state (checkboxes or highlighted cards)
- Store selected contacts in memory
- Wire up the "Continue" button to pass data to Step 7

**Estimated time:** 1-2 days for a developer

---

## 🔴 CRITICAL ISSUE #2: Calendar Day View

### 📍 Where to Find It
- Open the app
- Go to the Calendar screen
- Look for the view toggle buttons (Month/Week/Day)
- Tap the "Day" button

### ✅ What SHOULD Happen
When you tap "Day":
- Calendar switches to show just one day
- You see a timeline view (like Google Calendar's day view)
- Hours listed vertically (8am, 9am, 10am, etc.)
- Events shown in their time slots
- Can scroll through hours
- Can tap to add events at specific times

**Think of it like:** Opening your planner to a single day page with hourly slots.

### ❌ What ACTUALLY Happens
Instead:
- A message pops up: "Day view coming soon. Showing week view for now."
- The calendar stays in week view
- The Day button is highlighted but nothing changes
- Users are told the feature doesn't exist yet

### 🧪 How to Test This Yourself

**Run the app:**
```bash
flutter run -d chrome
```
Then:
1. Navigate to Calendar screen (from dashboard)
2. Look at the top - you'll see three buttons: Month | Week | Day
3. Tap "Month" - it works (shows full month)
4. Tap "Week" - it works (shows one week)
5. Tap "Day" - you get the "coming soon" message

**Or look at the code:**
- Open: `lib/screens/calendar_screen.dart`
- Search for: `case CalendarViewMode.day`
- You'll see it just shows a snackbar message

### 💥 Why This Matters

**User Impact:**
- Feature is advertised but doesn't work - feels like false advertising
- Users who prefer day view can't use it
- Confusing to have a button that doesn't work
- Makes the app feel incomplete

**Business Impact:**
- Can't claim "multiple calendar views" as a feature
- Users coming from Google Calendar expect this
- Competitors have this feature

### 🔧 The Fix Explained (In Simple Terms)

**What needs to be built:**

Think of creating a daily planner page:

1. **Create the timeline** - Draw a vertical list of hours (8am to 10pm)
2. **Position events** - Place events at their correct times
3. **Handle overlaps** - If two events are at the same time, show them side-by-side
4. **Make it scrollable** - Let users scroll through the day
5. **Add interactions** - Tap empty space to create event, tap event to view details

**The technical work:**
- Build a custom day view widget
- Calculate event positions based on time
- Handle event rendering and overlaps
- Add scroll functionality
- Wire up tap handlers for creating/viewing events

**Alternative:** Use an existing package like `flutter_week_view` that already has day view built

**Estimated time:** 2-3 days to build custom, or 1 day to integrate a package

---

## 🔴 CRITICAL ISSUE #3: Add Partner Button

### 📍 Where to Find It
- Open the app
- Go to "People & Groups" screen (from dashboard)
- Look for the "Add Partner" button in the top right

### ✅ What SHOULD Happen
When you tap "Add Partner":
- A form or dialog appears
- You can either:
  - Select someone from your contacts, OR
  - Manually type in their name, email, relationship
- Choose their permission level (Private/Semi-Visible/Visible)
- Decide if you want to invite them to the app or just reference them
- Tap "Save" or "Add"
- They appear in your partners list

**Think of it like:** Adding a friend on social media - you search for them or enter their info, then send a request.

### ❌ What ACTUALLY Happens
Instead:
- A message pops up: "Add Partner functionality coming soon"
- Nothing else happens
- No form, no dialog, nothing
- You're stuck with only the partners you added during onboarding

### 🧪 How to Test This Yourself

**Run the app:**
```bash
flutter run -d chrome
```
Then:
1. Navigate to "People & Groups" from dashboard
2. Look for the purple "Add Partner" button (top right)
3. Tap it
4. You'll see the "coming soon" message
5. Nothing gets added

**Or look at the code:**
- Open: `lib/screens/people_groups_screen.dart`
- Search for: `_buildAddPartnerButton`
- You'll see it just shows a snackbar with "coming soon"

### 💥 Why This Matters

**User Impact:**
- After onboarding, users CANNOT add more partners
- If they skip adding partners during setup, they're stuck
- If they get a new partner, they can't add them
- The app becomes useless for managing multiple relationships over time

**Business Impact:**
- This is a CORE feature - managing partners is the whole point
- Can't launch without this
- Users will immediately hit this limitation
- Makes the app feel like a demo, not a real product

### 🔧 The Fix Explained (In Simple Terms)

**What needs to be built:**

Imagine creating a "New Contact" form in your phone:

1. **Create the form** - Build a screen or popup with input fields
2. **Two options:**
   - **Option A:** "Select from Contacts" - Show contact picker (reuse Step 6 logic once it's built)
   - **Option B:** "Enter Manually" - Show name, email, relationship fields
3. **Set permissions** - Show the three permission options with explanations
4. **Choose invitation mode:**
   - "Just for my reference" (they won't see your calendar)
   - "Invite to app" (send them an invitation)
5. **Save it** - Add the partner to your list and database

**The technical work:**
- Create `AddPartnerDialog` or `AddPartnerScreen`
- Build form with validation (name required, email format check)
- Add contact picker integration
- Connect to `UserProfileProvider` to save the partner
- Persist to storage/database
- Show success message and update the list

**Estimated time:** 2-3 days (depends on contact picker complexity)

---

## 🔴 CRITICAL ISSUE #4: Delete Partner

### 📍 Where to Find It
- Open the app
- Go to "People & Groups" screen
- Find any partner in the list
- Look for the red trash icon on their card

### ✅ What SHOULD Happen
When you tap the delete icon:
- A confirmation dialog appears: "Are you sure you want to remove [Name]?"
- You tap "Delete" to confirm
- The partner is removed from your list
- The partner disappears from the screen
- All events associated with them are handled (either deleted or marked as "no partner")
- You see a success message

**Think of it like:** Unfriending someone on Facebook - you confirm, they're removed, and they no longer appear in your friends list.

### ❌ What ACTUALLY Happens
Instead:
- The confirmation dialog DOES appear (looks like it works!)
- You tap "Delete"
- You see a message: "[Name] removed"
- BUT... the partner is still in the list!
- Refresh the screen - they're still there
- Nothing actually got deleted

**This is extra confusing because it LOOKS like it worked!**

### 🧪 How to Test This Yourself

**Run the app:**
```bash
flutter run -d chrome
```
Then:
1. Go through onboarding and add at least one partner
2. Navigate to "People & Groups"
3. Find a partner card
4. Tap the red trash icon
5. Tap "Delete" in the confirmation
6. Watch - the partner stays in the list!
7. Close and reopen the app - they're still there

**Or look at the code:**
- Open: `lib/screens/people_groups_screen.dart`
- Search for: `_showDeleteConfirmation`
- Look at the delete button's `onPressed` - it just shows a snackbar, doesn't actually delete

### 💥 Why This Matters

**User Impact:**
- Users think they deleted someone but they didn't
- Creates confusion and frustration
- Breaks trust - "Does anything in this app actually work?"
- Users might try multiple times, getting more frustrated
- Could lead to privacy concerns if they think someone is removed but still has access

**Business Impact:**
- Serious trust issue - users feel deceived
- Could lead to bad reviews: "Buttons don't work"
- Privacy implications if users think they've removed access

### 🔧 The Fix Explained (In Simple Terms)

**What needs to be built:**

This is actually a SIMPLE fix - the UI is already built, we just need to connect it:

1. **Add the delete function** - Create a method in `UserProfileProvider` called `removePartner(id)`
2. **Call it** - When user confirms deletion, actually call that method
3. **Update the list** - Remove the partner from memory
4. **Save it** - Persist the change to storage/database
5. **Clean up events** - Decide what to do with events linked to that partner

**The technical work:**
- Add `removePartner(String id)` method to `UserProfileProvider`
- Call it in the delete confirmation handler (replace the TODO comment)
- Update the UI to reflect removal
- Handle associated events (maybe mark them as "no partner" or ask user)
- Persist to storage

**Estimated time:** 2-4 hours (very quick fix!)

---

## 🔴 CRITICAL ISSUE #5: Change Partner Permissions

### 📍 Where to Find It
- Open the app
- Go to "People & Groups" screen
- Find any partner in the list
- Look at the bottom of their card - there's a "Permission: [level]" section
- Tap on it

### ✅ What SHOULD Happen
When you tap the permission section:
- A dialog appears with three options:
  - **Visible** - "Full access to your calendar"
  - **Semi-Visible** - "Limited access to your calendar"
  - **Private** - "No access to your calendar"
- You select a new permission level
- Tap to confirm
- The partner's card updates to show the new permission
- The change is saved
- That partner now sees your calendar according to the new rules

**Think of it like:** Changing someone's role in a shared Google Doc - from "Editor" to "Viewer" to "No Access"

### ❌ What ACTUALLY Happens
Instead:
- The dialog DOES appear (looks good!)
- You can tap on a permission option
- You see a message: "Permission changed to [level]"
- BUT... look at the partner card - it still shows the OLD permission!
- Close and reopen - still the old permission
- Nothing actually changed

**Again, this LOOKS like it works but doesn't!**

### 🧪 How to Test This Yourself

**Run the app:**
```bash
flutter run -d chrome
```
Then:
1. Go through onboarding and add at least one partner
2. Navigate to "People & Groups"
3. Find a partner - note their current permission (e.g., "Visible")
4. Tap on the permission section at the bottom of their card
5. Select a different permission (e.g., "Private")
6. Watch the card - it still shows "Visible"!
7. Close and reopen - still "Visible"

**Or look at the code:**
- Open: `lib/screens/people_groups_screen.dart`
- Search for: `_buildPermissionOption`
- Look at the `onTap` - it just shows a snackbar, doesn't save anything

### 💥 Why This Matters

**User Impact:**
- This is THE CORE PRIVACY FEATURE of your app
- Users think they're controlling what partners see, but they're not
- Major privacy violation if someone thinks they set something to "Private" but it's still "Visible"
- Could lead to relationship problems if wrong person sees wrong events
- Breaks the entire trust model of the app

**Business Impact:**
- This is your app's main value proposition - consent-based calendar sharing
- Cannot launch without working privacy controls
- Huge liability if users think they have privacy but don't
- Could face legal issues if privacy settings don't work
- Will get terrible reviews: "Privacy settings don't work!"

### 🔧 The Fix Explained (In Simple Terms)

**What needs to be built:**

Similar to the delete issue - UI exists, just need to connect it:

1. **Save the selection** - When user picks a permission, actually save it
2. **Update the partner** - Call `UserProfileProvider.updatePartner()` with new permission
3. **Refresh the UI** - Make the card show the new permission immediately
4. **Persist it** - Save to storage/database
5. **Enforce it** - Make sure the event visibility logic respects these permissions

**The technical work:**
- Update the `onTap` handler in permission dialog
- Call `userProvider.updatePartner()` with new permission
- Make sure `updatePartner()` method works correctly
- Refresh the UI to show changes
- Persist to storage
- Verify event visibility logic uses these permissions

**Estimated time:** 3-4 hours (quick fix, but need to verify event visibility too)

---

## 📊 Summary of Critical Issues

| Issue | Severity | Time to Fix | Why Critical |
|-------|----------|-------------|--------------|
| **#1: Contact Selection** | 🔴 Highest | 1-2 days | Blocks onboarding completion |
| **#2: Day View** | 🟡 High | 1-3 days | Advertised feature missing |
| **#3: Add Partner** | 🔴 Highest | 2-3 days | Can't add partners after setup |
| **#4: Delete Partner** | 🔴 Highest | 2-4 hours | Looks like it works but doesn't - trust issue |
| **#5: Change Permissions** | 🔴 CRITICAL | 3-4 hours | Core privacy feature broken |

---

## 🎯 Recommended Testing Order

Test them in this order to understand the user journey:

1. **Start with Onboarding** (#1) - This is the first thing users see
2. **Then Calendar** (#2) - Second most used screen
3. **Then People & Groups** (#3, #4, #5) - Test all three issues on this screen together

---

## ✅ Verification Checklist

For each issue, confirm:
- [ ] I can reproduce the problem
- [ ] I understand what SHOULD happen
- [ ] I understand WHY it matters to users
- [ ] I understand the fix in simple terms
- [ ] I know how long it should take to fix

---

## 🤔 Questions to Consider

Before we start fixing, think about:

1. **Priority:** Which issue hurts users the most?
2. **Dependencies:** Do any fixes depend on others being done first?
3. **Resources:** Do you have a developer available? How many hours per week?
4. **Timeline:** When do you need this ready for users?
5. **Scope:** Are there other issues you've noticed that aren't in this list?

---

## 📞 Next Steps

After verifying these issues:
1. Confirm which ones you've tested and verified
2. Decide which to fix first
3. I'll create detailed implementation plans for each
4. We'll tackle them one by one

**Ready to start testing?** Pick one issue and follow the "How to Test" steps!
