# PolyHarmony Beta Onboarding UX Design

**Designer:** Sarah (UX-Onboarding-Designer)  
**Date:** January 2025  
**Status:** Complete - Ready for Implementation

## Executive Summary

I've completely redesigned the onboarding flow to meet beta testing requirements while maintaining a neurodiversity-affirming and polyamory-positive experience. The new 6-step flow ensures users feel safe, welcomed, and understood from their first moments with PolyHarmony.

## Design Philosophy

### 1. Emotional Safety First
- **Clear expectations**: Users know exactly what each step involves and why it's needed
- **No pressure**: Optional steps are clearly marked, users can skip calendar integration
- **Affirming language**: Copy validates polyamorous relationships as normal and beautiful
- **Gentle progression**: Each step builds confidence before moving to the next

### 2. Neurodiversity-Affirming Principles
- **Literal language**: Avoided metaphors and idioms that might confuse
- **Clear visual hierarchy**: Progress indicators, step counts, estimated times
- **Predictable navigation**: Consistent back/continue pattern throughout
- **Cognitive load management**: One concept per step, no overwhelming choices
- **Multiple input methods**: Text fields, switches, buttons - variety for different preferences

### 3. Beta Testing Requirements Integration
- **Data transparency**: Clear explanation of what data we collect and why
- **Consent granularity**: Separate agreements for different types of participation
- **Community building**: Frames beta testing as collaboration, not just "helping us debug"
- **Privacy emphasis**: Multiple reassurances about data protection and user control

## New 6-Step Flow Design

### Step 0: Welcome to PolyHarmony Beta (1 min)
**Goal:** Create excitement and set proper expectations for beta participation

**Key UX Decisions:**
- **Beta branding**: Clear "Beta" terminology with test tube icon
- **Community framing**: "You're among the first" creates exclusivity and belonging
- **Value proposition**: 4 clear benefits with check marks for easy scanning
- **Expectation setting**: Blue info box explains beta nature upfront
- **Emotional tone**: Excited and collaborative, not apologetic

**Neurodiversity Considerations:**
- Visual icons support text comprehension
- Benefits listed in scannable format
- Clear distinction between what's special vs. what to expect

### Step 1: Tell us about yourself (30 sec)
**Goal:** Collect username and display name with validation feedback

**Key UX Decisions:**
- **Real-time validation**: Username availability checks as user types
- **Clear visual feedback**: Green check, red X, loading spinner
- **Flexible identity**: Display name can be anything user is comfortable with
- **Context explanation**: Helper text explains how each field is used
- **Polyamory awareness**: Explicit note about username being visible to all partners

**Neurodiversity Considerations:**
- Input constraints clearly stated (min 3 characters)
- Immediate feedback prevents confusion
- Helper text explains context without assumptions
- Character limits shown to prevent truncation anxiety

### Step 2: Calendar Integration (2 min)
**Goal:** Optional calendar import with clear privacy assurances

**Key UX Decisions:**
- **Three clear options**: Google, Apple, or start fresh
- **Visual differentiation**: Different colored cards for each option
- **Privacy emphasis**: Amber warning box about read-only access
- **Skip option**: Prominent "Skip for now" button
- **Loading states**: Clear feedback during import process

**Neurodiversity Considerations:**
- Each option explained in simple terms
- Privacy concerns addressed proactively
- No penalty for skipping
- Loading state prevents wondering "did it work?"

### Step 3: Communication Preferences (30 sec)
**Goal:** Granular email consent with user control emphasis

**Key UX Decisions:**
- **Individual toggles**: Each email type separately controlled
- **Clear descriptions**: What each email type contains
- **User control messaging**: Blue info box emphasizes choice
- **Smart defaults**: Important notifications on, optional ones off
- **No hidden requirements**: All truly optional except account security

**Neurodiversity Considerations:**
- Switch controls provide clear on/off state
- Each option explained simply
- No "all or nothing" choices
- Reassurance about changing preferences later

### Step 4: Beta Agreement (2 min)
**Goal:** Comprehensive but approachable beta testing agreements

**Key UX Decisions:**
- **Card-based layout**: Each agreement type in separate colored card
- **Switch controls**: Individual consent for each aspect
- **Scannable format**: Icons, headings, short paragraphs
- **External link**: Privacy policy opens in new tab
- **Color coding**: Different colors for different agreement types
- **Progress validation**: Can't continue until all required items agreed

**Neurodiversity Considerations:**
- Information broken into digestible chunks
- Visual differentiation between agreement types
- Clear indication of what's required vs. optional
- Privacy policy accessible without losing form progress

### Step 5: You're ready to start! (Ready!)
**Goal:** Celebrate completion and set expectations for next steps

**Key UX Decisions:**
- **Celebration**: Gradient background, success imagery
- **Next steps preview**: 4 specific actions they can take
- **Community gratitude**: Acknowledges their beta testing contribution
- **Action-oriented close**: Button focuses on "organizing" not "using app"
- **Loading state**: Shows progress during account setup

**Neurodiversity Considerations:**
- Clear list of what to do next prevents "now what?" moment
- Specific examples rather than vague suggestions
- Loading feedback during final save operation

## Technical Implementation Needs

### Database Schema Requirements
```sql
-- New table needed
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(30) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  beta_participant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced user preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_updates BOOLEAN DEFAULT TRUE,
  beta_updates BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  feature_announcements BOOLEAN DEFAULT TRUE,
  calendar_integration VARCHAR(20) DEFAULT 'none',
  data_collection_consent BOOLEAN DEFAULT FALSE,
  feedback_consent BOOLEAN DEFAULT FALSE,
  beta_terms_accepted BOOLEAN DEFAULT FALSE,
  privacy_policy_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Component Dependencies
- All UI components already exist in the design system
- Switch component works well for granular consent
- Progress component enhances step navigation
- Card components create good visual separation

### Calendar Integration Placeholders
- Google Calendar OAuth flow needs implementation
- Apple Calendar integration requires research
- Currently shows loading state then saves preference only

## Accessibility Features

### Screen Reader Support
- All form fields have proper labels
- Switch controls have aria-labels
- Icons have appropriate alt text or are decorative
- Progress indicator includes textual progress

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus states visible on all controls
- Enter key submits forms appropriately

### Color and Contrast
- Used existing design system colors (tested for accessibility)
- Important information not conveyed by color alone
- Visual feedback includes icons and text, not just colors

## Content Strategy

### Tone and Voice
- **Warm but professional**: Acknowledges the personal nature of polyamory without being overly familiar
- **Inclusive language**: Uses "partner" consistently, acknowledges chosen names
- **Empowering**: Emphasizes user control and choice throughout
- **Collaborative**: Frames beta testing as building something together

### Sensitive Terminology
- "Relationships" rather than "partners" in some contexts to be inclusive of all connection types
- "Calendar spaces" rather than "calendars" to emphasize the collaborative nature
- "Privacy controls" rather than "settings" to emphasize the protective nature
- "Beta community" rather than "testers" to create belonging

## Testing Recommendations

### Usability Testing Priorities
1. **Username validation flow**: Does real-time feedback help or distract?
2. **Beta agreement comprehension**: Do users understand what they're agreeing to?
3. **Calendar integration expectations**: Are privacy assurances sufficient?
4. **Emotional response tracking**: How do users feel during each step?

### A/B Testing Opportunities
1. **Progress indicator style**: Linear vs. step dots vs. percentage
2. **Beta agreement format**: Cards vs. single long form
3. **Calendar integration order**: Before or after communication preferences?

### Accessibility Testing
1. Screen reader flow testing
2. Keyboard-only navigation testing
3. Color contrast verification
4. Mobile responsiveness validation

## Success Metrics

### User Experience Metrics
- **Completion rate**: % of users who complete all 6 steps
- **Step abandonment**: Where users drop off most frequently
- **Time per step**: Are estimates accurate?
- **Return rate**: Do users come back if they exit mid-flow?

### Beta Participation Metrics
- **Consent rates**: What % agree to data collection, feedback requests?
- **Calendar integration uptake**: How many choose each option?
- **Communication preferences**: What email types are most/least popular?

### Emotional Safety Metrics
- **Post-onboarding survey**: How safe/welcomed did users feel?
- **Support ticket analysis**: Any confusion or concerns raised?
- **User feedback**: Qualitative responses about the experience

## Future Iterations

### Potential Improvements
1. **Progressive disclosure**: Add "Learn more" sections for complex topics
2. **Personalization**: Adapt flow based on calendar integration choice
3. **Preview mode**: Show users what their dashboard will look like
4. **Relationship guidance**: Optional tips for polyamory beginners

### Advanced Features
1. **Accessibility preferences**: Font size, motion sensitivity settings
2. **Language selection**: Multi-language support for inclusive access
3. **Time zone detection**: Smart defaults based on location
4. **Import validation**: Preview imported calendar events before confirming

## Developer Handoff Notes

### Critical UX Requirements
1. **Real-time username validation** must be responsive (< 500ms)
2. **Loading states** are essential for user confidence
3. **Error handling** should be gentle and provide clear next steps
4. **Mobile responsiveness** is crucial for accessibility
5. **Data persistence** if user navigates away mid-flow

### Nice-to-Have Features
1. **Save and continue later**: Allow pausing mid-onboarding
2. **Progress persistence**: Remember partially completed steps
3. **Smooth animations**: Enhance step transitions
4. **Smart defaults**: Pre-fill based on signup information

The onboarding experience sets the tone for the entire PolyHarmony relationship. This design prioritizes emotional safety, clear communication, and user empowerment while efficiently collecting the data needed for beta testing. The result should feel like being welcomed into a supportive community, not just signing up for another app.