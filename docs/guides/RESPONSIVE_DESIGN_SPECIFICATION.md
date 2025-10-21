# Responsive Design Specification - MyOrbit Calendar App

## Overview
This document details a mobile-first responsive design architecture for MyOrbit. You are in complete control of which changes to implement and in what order.

**Current System Breakpoints:**
- **Mobile (< 480px):** Small phones - iPhone SE, older Android devices
- **Phone (480-600px):** Standard phones - iPhone 12, 13, 14 (compact)
- **Tablet (600-900px):** iPads, large Android tablets
- **Large Tablet (900-1200px):** iPad Pro, desktop/web browsers
- **Desktop (> 1200px):** Desktop and large monitors

---

## 1. RESPONSIVE TYPOGRAPHY SYSTEM

### What I've Already Implemented
Created `ResponsiveTextStyles` class that automatically scales text based on screen width:

```dart
// Scaling formula:
- Mobile (< 600px): 1.0x scale (base size)
- Tablet (600-900px): 1.1x - 1.2x scale (smooth interpolation)
- Large Tablet (> 900px): 1.3x scale
```

### Text Style Scaling Examples

| Element | Mobile | Tablet | Desktop | Notes |
|---------|--------|--------|---------|-------|
| Heading 1 | 32px | 35-36px | 42px | Hero titles |
| Heading 2 | 28px | 31px | 36px | Section headers |
| Heading 3 | 24px | 26px | 31px | Subsection headers |
| Heading 4 | 20px | 22px | 26px | Card titles |
| Body Large | 18px | 20px | 23px | Main content |
| Body Medium | 16px | 18px | 21px | Default body text |
| Body Small | 14px | 15px | 18px | Secondary text |
| Caption | 13px | 14px | 17px | Small labels |
| Button (Large) | 16px | 18px | 21px | Primary buttons |
| Button (Medium) | 14px | 15px | 18px | Secondary buttons |
| Button (Small) | 12px | 13px | 16px | Icon buttons, chips |
| Toggle Label | 14px | 15px | 18px | Calendar view toggle ✓ |

### How to Use in Components
```dart
// In any build method with context:
Text(
  'My Text',
  style: context.responsiveText.bodyMedium,
);

// Or for specific types:
Text(
  'Button Label',
  style: context.responsiveText.buttonMedium,
);
```

---

## 2. COMPONENT-LEVEL RESPONSIVE CHANGES

### 2.1 Calendar Toggle Buttons (Status: ✓ DONE)
**Location:** `lib/ui/screens/calendar_screen.dart` → `_buildViewButton`

**Changes Made:**
- ✓ Added responsive text styling (14px → scales to 18px on desktop)
- ✓ Added responsive icon sizing (20px → scales to 22px on tablet/desktop)
- ✓ Already has responsive padding (8px horizontal)

**What This Means:**
- On mobile: "Month" button remains compact (14px text)
- On tablet: Text grows to 15px, readability improves
- On desktop: Text becomes 18px, more spacious feel

---

### 2.2 Calendar Screen - Full Layout Changes

**Current Structure (Mobile-Only):**
```
[Header with logo]
  ↓
[Month/Week/Day Toggle] ← (already responsive ✓)
  ↓
[Calendar Grid] (fills full width, single column)
  ↓
[Events List] (full width)
```

**Proposed Responsive Changes:**

#### 2.2a - Month/Year Header
**MOBILE (< 600px):**
- Font size: 20px
- Container: full width minus 16px margins
- Padding: 12px horizontal, 8px vertical

**TABLET (600-900px):**
- Font size: 22px
- Container: centered with max-width 600px
- Padding: 16px horizontal, 12px vertical
- Left & right navigation buttons slightly larger

**LARGE/DESKTOP (> 900px):**
- Font size: 26px
- Container: max-width 800px, centered
- Padding: 20px horizontal, 16px vertical
- More spacing between navigation buttons

**Decision Point:** Should navigation arrows grow on larger screens?

#### 2.2b - Calendar Grid Layout
**Current Issue:** Calendar grid is 7 columns (Sun-Sat), looks cramped on phones

**MOBILE:**
- Grid: 7 columns as-is
- Cell height: 64px (current)
- Day number: 20px font
- Indicators: 2px height bars
- Spacing between cells: 2px

**TABLET:**
- Grid: Same 7 columns but more spacious
- Cell height: 80px (8% taller)
- Day number: 22px font (responsive scaled)
- Indicators: 3px height bars (more visible)
- Spacing: 4px between cells
- Date padding: 16px instead of 12px

**LARGE TABLET/DESKTOP:**
- Cell height: 100px
- Day number: 26px font
- Indicators: 4px height bars
- Spacing: 6px between cells
- Add week numbers on left side? (optional)

**Decision Points:**
1. Should calendar cards become wider and show more info on desktop?
2. Should we show multiple weeks in a different layout on large screens?
3. Do you want timeline/agenda view for desktop?

#### 2.2c - Events Section Below Calendar
**Current Issues:**
- Full width on all screens
- Large padding (24px) doesn't scale
- Card titles (20px) might be too large on mobile

**MOBILE (< 600px):**
- Width: Full screen with 16px margins
- Section padding: 24px
- Title font: 20px (current)
- Event cards: Stack vertically, full width
- Button size: 56px height (FAB)

**TABLET (600-900px):**
- Max-width: 600px, centered
- Section padding: 28px
- Title font: 22px (responsive scaled)
- Event cards: Still stack, but with more breathing room
- Button size: 56px (same, already good)

**DESKTOP (> 900px):**
- Max-width: 800px
- Section padding: 32px
- Title font: 26px
- Event cards: Could show 2 columns if many events?
- Or keep single column but wider cards (more readable)

**Decision Point:** Should desktop show event cards in multiple columns or keep single column?

---

### 2.3 Dashboard Screen

**Current Structure:**
```
[Logo - 224x224px]
[Notification Bell] ← top-right
  ↓
[Action Buttons Row] ← 4 buttons
  ↓
[Greeting] ← 16px text
  ↓
[Next Event Card]
[Events This Week]
[Recent Activity]
[People & Groups]
[Signals Card]
```

**Responsive Changes Needed:**

#### 2.3a - Logo Sizing
**MOBILE:** 224x224px (current) ✓ Fine for small screens
**TABLET:** 240x240px (slightly larger)
**DESKTOP:** 280x280px (proportionally larger)

**Implementation:**
```dart
final logoSize = context.responsive.isPhone ? 224.0 :
                 context.responsive.isTablet ? 240.0 : 280.0;
```

#### 2.3b - Action Buttons Row
**Current Issue:** 4 buttons in single row becomes cramped on small phones

**MOBILE (< 480px):**
- Layout: 2x2 grid (not 4 in a row)
- Button size: 48px height, rounded
- Text: 12px (buttonSmall)
- Padding: 8px between buttons

**MOBILE (480-600px):**
- Layout: Keep 4 in a row but with better spacing
- Button height: 56px
- Text: 14px (responsive)
- Padding: 8px between buttons

**TABLET (600-900px):**
- Layout: 4 in a row
- Button height: 64px
- Text: 14px (responsive scaled to 15px)
- Padding: 12px between buttons
- Add icon size increase

**DESKTOP (> 900px):**
- Layout: Optional - could be 4 in a row or 2x2 with more space
- Button height: 72px
- Text: 16px (responsive scaled)
- Padding: 20px between buttons

**Decision Points:**
1. Should small phones (< 480px) use 2x2 grid for buttons?
2. Should button icons scale on larger screens?

#### 2.3c - Card Spacing and Sizing
**Current:** All cards have `SizedBox(height: 8)` between them

**MOBILE:**
- Keep 8px (tight on small screens)
- Card padding: 16px
- Card border radius: 20px
- Font sizes: as-is (will scale via responsive system)

**TABLET:**
- Spacing: 12px between cards (more breathing room)
- Card padding: 20px
- Card border radius: 24px
- Max-width: 600px, centered

**DESKTOP:**
- Spacing: 16px between cards
- Card padding: 24px
- Max-width: 800px
- Could organize cards in 2-column grid layout

**Decision Point:** On desktop, should cards be in a grid layout (e.g., 2 columns) for better use of space?

---

### 2.4 Settings Screen

**Current Issues:**
- Full width with 16px padding
- Very long scrollable list
- All sections stack vertically
- No hierarchy based on importance

**MOBILE (< 600px):**
- Width: Full with 16px margins
- Section padding: 16px
- Dividers: 1px, subtle
- Toggle height: 48px
- Font sizes: as-is (will scale responsively)

**TABLET (600-900px):**
- Max-width: 600px, centered
- Section padding: 20px
- All sections still stack (not enough space for sidebar)
- Divider: 1px, slightly more prominent
- Toggle height: 56px

**LARGE TABLET/DESKTOP (> 900px):**
- New layout: Sidebar navigation + content area
- Sidebar: 200px width (fixed)
  - Navigation items (Profile, Appearance, Calendar, Notifications, etc.)
  - Font: 14px with hover effects
  - Current section highlighted
- Content area: 600px max-width, right side
- Section padding: 24px
- Toggle height: 56px
- Better visual hierarchy

**Decision Points:**
1. Should settings use a sidebar layout on desktop?
2. Which settings are most important (should be above the fold)?
3. Should we group related settings differently on different screens?

---

### 2.5 Activity/Notifications Screen

**Current Structure:**
```
[Header] "Activity Overview"
  ↓
[Activity Items List]
  ├─ Today section
  └─ Older section (collapsible)
```

**MOBILE (< 600px):**
- Padding: 20px left/right
- Activity card height: auto (content-driven)
- Card padding: 18px
- Font: 14px body, 12px secondary
- Timestamp: 12px gray text

**TABLET (600-900px):**
- Max-width: 600px, centered
- Padding: 24px left/right
- Activity card height: slightly more spacious
- Card padding: 20px
- Font: 14px body (responsive → 15px), 13px secondary
- Add subtle background color to differentiate Today vs Older

**DESKTOP (> 900px):**
- Max-width: 800px
- Could show activity in 2 columns OR keep single column for readability?
- Card padding: 24px
- Font: 16px body (responsive scaled), 14px secondary
- Timestamp: 13px
- Better visual separation between sections

**Decision Point:** Should activity list show multiple columns on desktop, or is single column better for readability?

---

### 2.6 Create Event Screen

**Current Issues:**
- Full-screen modal, but form fields don't scale well on large screens
- Text input fields are same width on all screens
- Too much horizontal scrolling on desktop

**MOBILE (< 600px):**
- Full width input fields
- AppBar height: 56px
- Title font: 20px
- Form padding: 16px
- Input field height: 48px

**TABLET (600-900px):**
- Max-width: 600px, centered
- AppBar height: 64px
- Title font: 22px (responsive)
- Form padding: 20px
- Input field height: 56px
- Section headers: 16px (responsive → 17px)

**DESKTOP (> 900px):**
- Max-width: 700px, centered
- AppBar height: 64px
- Title font: 26px (responsive)
- Form padding: 24px
- Input field height: 56px
- Consider 2-column layout for some fields:
  - Left: Title, Description, Attendees
  - Right: Date, Time, Privacy, Calendar selection

**Implementation Consideration:**
Form layout could change at breakpoints:
```dart
if (context.responsive.isPhone) {
  return Column([...allFields]); // Stack vertically
} else if (context.responsive.isDesktop) {
  return Row([
    Expanded(child: Column([fields1])),
    SizedBox(width: 20),
    Expanded(child: Column([fields2])),
  ]); // Side-by-side
}
```

**Decision Point:** Should form layout change from vertical to horizontal on desktop?

---

### 2.7 Calendar Sharing & Signal Center Screens

**Similar patterns apply:**
- List-based content: Single column mobile → potentially 2 columns desktop
- Cards: Stack on mobile, grid on desktop
- Modal dialogs: Full-width mobile → constrained width desktop

---

## 3. GENERAL RESPONSIVE PATTERNS TO APPLY EVERYWHERE

### 3.1 Safe Area Padding (Current: Fixed 24px top)

**Change Required:** Make SafeArea proportional

```dart
// Current (all screens):
SafeArea(minimum: const EdgeInsets.only(top: 24))

// Proposed:
SafeArea(minimum: EdgeInsets.only(
  top: max(16, MediaQuery.paddingOf(context).top + 8),
))
// This respects actual device notches/dynamic island
```

### 3.2 Screen Horizontal Padding

**Current:** Hardcoded 16-24px everywhere

**Proposed Pattern:**
```dart
SingleChildScrollView(
  padding: EdgeInsets.symmetric(
    horizontal: context.responsive.screenHorizontalPadding,
  ),
)
```

**Values:**
- Mobile: 16px (AppSpacing.lg)
- Tablet: 20px (AppSpacing.xl)
- Desktop: 32px (AppSpacing.xxxl)

### 3.3 Max-Width Constraint for Content

**Issue:** On large screens, content stretches too wide (looks awkward)

**Solution:** Wrap main content areas

```dart
ConstrainedBox(
  constraints: BoxConstraints(
    maxWidth: context.responsive.contentMaxWidth,
  ),
  child: Center(child: content),
)
```

**Values:**
- Mobile (< 600px): no constraint (full width)
- Tablet: 600px max-width
- Large Tablet: 800px max-width
- Desktop: 1000px max-width

### 3.4 Card and Component Spacing

**Pattern:** Use responsive spacing multiplier

```dart
SizedBox(height: AppSpacing.md * context.responsive.spacingMultiplier)
```

**Multipliers:**
- Small phone: 0.8x (compress spacing)
- Phone: 1.0x (standard)
- Tablet: 1.1x (add breathing room)
- Large: 1.2x-1.3x (spacious)

### 3.5 Grid Layouts for Lists

**Pattern:** Adapt column count based on screen size

```dart
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: context.responsive.gridColumns,
    mainAxisSpacing: 16,
    crossAxisSpacing: 16,
  ),
  itemCount: items.length,
  itemBuilder: (context, index) => _buildGridItem(items[index]),
)
```

**Column Counts:**
- Mobile: 1 column
- Tablet: 2 columns
- Large Tablet: 3 columns
- Desktop: 4 columns

**When to use:** Event lists, activity feeds, calendar/contact views on larger screens

### 3.6 Icon Sizing

**Pattern:** Scale icons responsively

```dart
Icon(
  Icons.settings,
  size: context.responsive.iconSizeMedium,
)
```

**Sizes:**
- Small: 16-17px (base 16px)
- Medium: 20-22px (base 20px)
- Large: 24-26px (base 24px)
- XLarge: 32-38px (base 32px)

---

## 4. IMPLEMENTATION ROADMAP - Your Choices

### Phase 1: Foundation (Already Done ✓)
- ✓ Created `ResponsiveTextStyles` class
- ✓ Created `ResponsiveUtils` extension for easy access
- ✓ Updated Calendar toggle buttons to use responsive typography
- ✓ Dart MCP & DCM servers active for code quality

### Phase 2: Apply Typography Everywhere (Recommended Next: 2-3 hours)
**What needs updating:**
1. Dashboard screen
   - Logo sizing based on screen
   - Button row layout (2x2 on small, 4 in a row on medium+)
   - Card spacing proportional to screen
   
2. Calendar screen
   - Month/year header styling responsive
   - Events section cards responsive padding
   - Add max-width constraint to prevent stretching

3. Settings screen
   - All text sizing responsive
   - Consider sidebar layout on desktop

4. Activity screen
   - All text sizing responsive
   - Optional: 2-column layout on desktop

**Estimated effort:** 2-3 hours
**Files to modify:** dashboard_screen.dart, calendar_screen.dart, settings_screen.dart, activity_screen.dart, notifications_screen.dart

---

### Phase 3: Layout Adaptations (Optional: 4-6 hours)
**What would change:**
- Calendar grid: Larger cells + more spacing on tablets/desktop
- Button rows: Conditional 2x2 vs 4-in-a-row based on screen
- List views: Optional 2-column grids on larger screens
- Create event form: Optional 2-column layout on desktop
- Settings: Optional sidebar navigation on desktop

**Decision required:** Do you want these layout changes?

---

### Phase 4: Max-Width Constraints (1-2 hours)
**What changes:**
- Wrap all main content with `ConstrainedBox`
- Add SafeArea top padding proportional to device

**Impact:** Prevents awkward full-width stretching on desktop/web

---

## 5. DECISION MATRIX - What Do You Want?

Below is a checklist. You decide what to implement:

### Must-Have (I recommend these)
- [ ] Apply responsive typography to all screens (Phase 2)
- [ ] Add max-width constraints (Phase 4, 1 hour)
- [ ] Proportional SafeArea padding (Phase 4, 30 min)

### Nice-to-Have (professional polish)
- [ ] Dashboard button layout: 2x2 on small phones (Phase 3)
- [ ] Calendar grid: Larger cells on tablets (Phase 3)
- [ ] Settings: Sidebar layout on desktop (Phase 3)
- [ ] Activity: 2-column layout option on desktop (Phase 3)

### Advanced (ambitious but valuable)
- [ ] Create event form: 2-column on desktop (Phase 3)
- [ ] Calendar: Responsive grid columns on large screens (Phase 3)
- [ ] Dynamic list → grid transitions (Phase 3)

---

## 6. SPECIFIC CODE EXAMPLES

### Example 1: Dashboard Button Row - Responsive Layout

```dart
// OPTION A: Always 4 in a row (current)
Row(
  children: actionButtons,
)

// OPTION B: 2x2 on small, 4 in a row on medium+
if (context.responsive.isSmallPhone)
  GridView.count(
    crossAxisCount: 2,
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
    shrinkWrap: true,
    children: actionButtons,
  )
else
  Row(children: actionButtons)

// OPTION C: Recommended - using gridColumns helper
GridView.count(
  crossAxisCount: context.responsive.isPhone ? 2 : 4,
  mainAxisSpacing: 12,
  crossAxisSpacing: 12,
  children: actionButtons,
)
```

### Example 2: Calendar Section - Max-Width Constrained

```dart
// Current:
Container(
  margin: const EdgeInsets.symmetric(horizontal: 16),
  padding: const EdgeInsets.all(16),
  child: Column(children: [...]),
)

// Proposed:
ConstrainedBox(
  constraints: BoxConstraints(
    maxWidth: context.responsive.contentMaxWidth,
  ),
  child: Center(
    child: Container(
      margin: EdgeInsets.symmetric(
        horizontal: context.responsive.screenHorizontalPadding,
      ),
      padding: EdgeInsets.all(16 * context.responsive.spacingMultiplier),
      child: Column(children: [...]),
    ),
  ),
)
```

### Example 3: Settings - Conditional Layout

```dart
// Mobile: Stacked list
// Desktop: Sidebar + content

if (context.responsive.isDesktop)
  Row(
    children: [
      SizedBox(
        width: 200,
        child: _buildSettingsSidebar(),
      ),
      const SizedBox(width: 20),
      Expanded(
        child: _buildSettingsContent(),
      ),
    ],
  )
else
  _buildSettingsContent()
```

---

## 7. TESTING YOUR RESPONSIVE DESIGN

### Test Breakpoints in Flutter DevTools
```bash
# Run app with different screen sizes
flutter run -d chrome --web-renderer html

# In Chrome DevTools:
1. F12 → Device Emulation (Ctrl+Shift+M)
2. Test these sizes:
   - 320x640: Small phone
   - 480x854: Standard phone
   - 600x800: Tablet
   - 900x1200: Large tablet
   - 1920x1080: Desktop
```

### Check with DCM
```bash
dcm analyze lib/ui/screens/
dcm format lib/ui/screens/ --fix
```

---

## 8. QUESTIONS FOR YOU

Before I start implementing Phase 2, please clarify:

1. **Button Rows:** Should small phones (< 480px) use 2x2 grid, or stay 4-in-a-row even if cramped?

2. **Calendar Grid:** On desktop, should cells be significantly larger with more event details, or keep current density?

3. **List → Grid Transitions:** When should content switch from single-column list to multi-column grid?
   - Events list on desktop: 1 or 2 columns?
   - Activity feed on desktop: 1 or 2 columns?

4. **Settings Layout:** Should settings use a sidebar on desktop (professional) or stay single-column?

5. **Create Event Form:** Should it become 2-column on desktop for better space usage?

6. **Priority:** Start with Phase 2 (typography everywhere), or would you prefer I tackle specific screens first?

---

## Next Steps

1. Review this specification
2. Answer the 6 questions above
3. I'll implement your chosen approach with DCM code quality checks
4. We'll test across breakpoints

**Ready to start Phase 2?**
