# Family Subscriptions: Future Roadmap & Implementation Options

**For:** Founder planning feature roadmap  
**Status:** Planning Phase (do not build yet)  
**Timeline:** Post-MVP (3-6 months after launch)  
**Complexity:** Medium (requires payment processor integration)

---

## Executive Summary

Family subscriptions let one person (owner) purchase a plan and invite family members. This requires:

✅ **Family group management** (create groups, invite members)  
✅ **Subscription tracking** (which family owns which subscription)  
✅ **Payment processing** (Stripe/Paddle integration)  
✅ **Simple roles** (Owner/Member - just 2, not complex RBAC)  

**NOT required:** Full admin dashboards, support staff roles, complex permission system.

---

## How It Works (User's Perspective)

### Today (Before Family Plans)
```
Sarah purchases Individual Plan
→ Sarah signs in
→ Sarah shares calendar with John (at "Visible" level)
→ John signs in
→ John pays separately for Individual Plan
```

### With Family Plans
```
Sarah purchases Family Plan ($X/month for up to 6 people)
→ Sarah signs in & creates "Smith Family" group
→ Sarah clicks "Invite Family Member"
→ System emails John a link: "myorbit.com/join-family/abc123"
→ John clicks link & signs up
→ John is automatically added to Smith Family
→ System tracks this: only Sarah pays (for whole family)
→ Everyone shares calendars as before
```

**Key difference:** One subscription covers multiple people instead of paying multiple times.

---

## Part 1: Where Things Live (Database vs. App Code)

This is crucial to understand. **There are three options:**

### Quick Reference

| Feature | Supabase (Database) | App Code | Decision |
|---------|-------------------|----------|----------|
| Family group data | YES | NO | Database stores data |
| Family member list | YES | NO | Database stores relationships |
| Role (Owner/Member) | YES | Read by app | DB stores, app enforces UI |
| Billing tracking | YES | NO | Financial data must be in DB |
| Invite links | YES | YES | DB stores link, app validates |
| Permission rules | MAYBE | YES | App logic to enforce rules |

**Rule of thumb:**
- 🗄️ **Supabase stores:** Data (users, groups, subscriptions)
- 📱 **App enforces:** Business logic (UI flows, calculations, access)

---

## Part 2: Three Implementation Options

### Option A: Simple (App Handles Everything)

**Database tables needed:**
```sql
-- In Supabase
CREATE TABLE family_groups (
  id UUID PRIMARY KEY,
  owner_id UUID,                    -- Who paid for it
  name TEXT,                        -- "Smith Family"
  subscription_tier TEXT,           -- "family", "individual"
  stripe_customer_id TEXT,          -- For billing
  created_at TIMESTAMP
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  family_id UUID,
  user_id UUID,
  role TEXT,                        -- "owner" or "member"
  joined_at TIMESTAMP
);

-- Update profiles table
ALTER TABLE profiles ADD COLUMN family_id UUID REFERENCES family_groups(id);
```

**App code handles:**
- Reading family_id from user profile
- Showing "You're in Smith Family" message
- Displaying family member list
- Enforcing who can invite (just the owner)

**Pros:**
- ✅ Simple to code initially
- ✅ Easy to change rules on the fly
- ✅ No complex SQL needed

**Cons:**
- ❌ Security risk: If app is hacked, anyone could see family data
- ❌ Requires app updates to change rules
- ❌ No database-level enforcement

**Cost to build:** 8-10 hours

---

### Option B: Hybrid (Recommended) ⭐

**Database tables** (same as Option A, PLUS):
```sql
-- Row-level security policies
CREATE POLICY "Users can see their family members"
  ON family_members
  FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM profiles 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Only family owner can invite"
  ON family_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM family_groups 
      WHERE id = family_id
    )
  );
```

**App code handles:**
- UI flows (screens, buttons, navigation)
- Billing logic (Stripe integration)
- User-friendly messages & UX
- Offline handling

**Database enforces:**
- Who can see what (RLS policies)
- Data integrity (constraints)
- Who can modify what (INSERT/UPDATE/DELETE permissions)

**Pros:**
- ✅ Secure: Database enforces rules, can't be bypassed
- ✅ Flexible: App can change UX without code
- ✅ Fast: Database stops unauthorized requests before they reach app
- ✅ Auditable: All changes logged in database

**Cons:**
- ⚠️ More SQL needed
- ⚠️ Requires understanding RLS policies
- ⚠️ Slightly more complex to test

**Cost to build:** 12-16 hours

**Recommendation:** This is the professional approach. Worth the extra 4 hours.

---

### Option C: Stripe-Centric (Maximum Flexibility)

**Instead of building family logic, use Stripe's billing system:**

```
Stripe Account
├── Main Customer (Sarah)
│   └── Subscription: Family Plan $X/month
│       └── Stripe Seats/Billing Portal
│           ├── Seat: Sarah (owner)
│           ├── Seat: John (member)
│           └── Seat: Jane (member)
└── Database just reads from Stripe
    ("Who's in this family?")
```

**Pros:**
- ✅ Stripe handles all family management
- ✅ Professional billing UI (free)
- ✅ Automatic seat management
- ✅ Invoicing handled by Stripe
- ✅ Easiest to scale

**Cons:**
- ❌ Stripe charges 2.9% + $0.30 per transaction (vs. fixed cost)
- ❌ Less control over UX
- ❌ Requires deeper Stripe integration

**Cost to build:** 15-20 hours (mostly learning Stripe API)

**When to use:** After you have 100+ paying customers and billing complexity grows.

**For MVP:** Skip this. Use Option B.

---

## Part 3: Specific Implementation Details

### Where Each Thing Lives

#### Family Owner Role

**Supabase Storage:**
```sql
-- family_members table has a "role" column
-- One row per family member
INSERT INTO family_members (family_id, user_id, role)
VALUES ('fam-123', 'user-456', 'owner');
```

**App Code Usage:**
```dart
// In Flutter app
final userRole = await fetchUserFamilyRole(currentUser.id);

if (userRole == 'owner') {
  // Show "Invite Members" button
  // Show "Manage Subscription" option
  // Show "Remove Member" option
} else {
  // Show read-only view
}
```

**Database Enforcement:**
```sql
-- Only owner can add new members
CREATE POLICY "Only owner can invite members"
  ON family_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_id = family_members.family_id 
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );
```

**Summary:**
- 🗄️ **Supabase:** Stores the role (owner/member) in family_members.role
- 📱 **App:** Reads role and shows/hides UI buttons
- 🔒 **Database Policy:** Enforces that only owner can modify

---

#### Family Member Role

**Supabase Storage:**
```sql
-- Same as above, just role = 'member'
INSERT INTO family_members (family_id, user_id, role)
VALUES ('fam-123', 'user-789', 'member');
```

**App Code Usage:**
```dart
final isFamilyMember = userRole == 'member';

if (isFamilyMember) {
  // Show "Leave Family" option
  // Show family member list (read-only)
  // Show "Go Pro to Invite" (greyed out)
}
```

**Database Enforcement:**
```sql
-- Members can see but not modify family settings
CREATE POLICY "Members can see family but not modify"
  ON family_groups FOR SELECT
  USING (id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid()
  ));

-- Members cannot update
CREATE POLICY "Members cannot modify family settings"
  ON family_groups FOR UPDATE
  USING (false); -- Completely blocked
```

**Summary:**
- 🗄️ **Supabase:** Stores role = 'member'
- 📱 **App:** Reads and limits UI options
- 🔒 **Database:** Blocks any modification attempts

---

#### "Family" Field in User Profiles

**Current Structure:**
```sql
-- profiles table (already exists)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  family_id UUID,  -- ← Add this
  ...
);
```

**What It Stores:**
```
Sarah's profile: family_id = 'fam-123'
John's profile: family_id = 'fam-123'  (same family)
Jane's profile: family_id = NULL         (no family yet)
```

**App Usage:**
```dart
// Check if user is in a family
if (currentUser.familyId != null) {
  print("In family: ${currentUser.familyId}");
  // Show family members
} else {
  print("Not in a family");
  // Show "Create Family" or "Join Family" button
}
```

**Why Both Places?**
- `profiles.family_id` - quick lookup for current user
- `family_members` table - detailed roles and permissions

**Database Enforcement:**
```sql
-- Ensure consistency: if in family_members, must have family_id
-- Handled by foreign key constraints

-- Optional: trigger to auto-update profiles when added to family
CREATE TRIGGER update_profile_family_id
AFTER INSERT ON family_members
FOR EACH ROW
EXECUTE FUNCTION sync_profile_family_id();
```

**Summary:**
- 🗄️ **Supabase:** Stores family_id in profiles table
- 📱 **App:** Reads to determine UI layout
- 🔒 **Database:** Enforces via constraints and triggers

---

## Part 4: Code Architecture Examples

### Option B Implementation (Recommended)

**Database Schema:**
```sql
-- 1. Create family_groups table
CREATE TABLE family_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,                    -- "Smith Family"
  subscription_tier TEXT NOT NULL,       -- "family", "individual"
  max_members INT DEFAULT 6,
  stripe_customer_id TEXT,               -- From Stripe
  stripe_subscription_id TEXT,
  billing_email TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create family_members table (roles)
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES profiles(id),
  UNIQUE(family_id, user_id)
);

-- 3. Update profiles table
ALTER TABLE profiles ADD COLUMN family_id UUID REFERENCES family_groups(id);

-- 4. Create invite_links table
CREATE TABLE family_invite_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family_groups(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,           -- Random token
  email TEXT,                           -- Optional: pre-fill email
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invite_links ENABLE ROW LEVEL SECURITY;
```

**RLS Policies:**
```sql
-- Family groups: Users can see their own family
CREATE POLICY "Users can view their family"
  ON family_groups FOR SELECT
  USING (id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid()
  ));

-- Family members: Users can see members of their family
CREATE POLICY "Users can view family members"
  ON family_members FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid()
  ));

-- Only owner can insert new members
CREATE POLICY "Only owner can invite members"
  ON family_members FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM family_groups WHERE id = family_id
    )
  );

-- Members cannot delete other members (only owner can)
CREATE POLICY "Only owner can remove members"
  ON family_members FOR DELETE
  USING (
    auth.uid() = (
      SELECT owner_id FROM family_groups WHERE id = family_id
    )
  );
```

**App Code (Dart/Flutter):**
```dart
// Model
class FamilyGroup {
  final String id;
  final String name;
  final String ownerId;
  final List<FamilyMember> members;
  final String subscriptionTier;
  final int maxMembers;

  FamilyGroup({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.members,
    required this.subscriptionTier,
    required this.maxMembers,
  });
}

class FamilyMember {
  final String id;
  final String userId;
  final String role; // 'owner' or 'member'
  final DateTime joinedAt;

  bool get isOwner => role == 'owner';
}

// Service
class FamilyService {
  final SupabaseClient client;

  // Get current user's family
  Future<FamilyGroup?> getCurrentUserFamily() async {
    try {
      final userId = client.auth.currentUser?.id;
      if (userId == null) return null;

      // First check if user is in a family
      final response = await client
          .from('family_members')
          .select('family_id')
          .eq('user_id', userId)
          .single();

      if (response == null) return null;

      final familyId = response['family_id'] as String;
      return getFamilyById(familyId);
    } catch (e) {
      return null; // User not in family
    }
  }

  // Get family details
  Future<FamilyGroup> getFamilyById(String familyId) async {
    final groupResponse = await client
        .from('family_groups')
        .select()
        .eq('id', familyId)
        .single();

    final membersResponse = await client
        .from('family_members')
        .select()
        .eq('family_id', familyId);

    return FamilyGroup(
      id: groupResponse['id'],
      name: groupResponse['name'],
      ownerId: groupResponse['owner_id'],
      subscriptionTier: groupResponse['subscription_tier'],
      maxMembers: groupResponse['max_members'],
      members: List<FamilyMember>.from(
        membersResponse.map((m) => FamilyMember(
          id: m['id'],
          userId: m['user_id'],
          role: m['role'],
          joinedAt: DateTime.parse(m['joined_at']),
        )),
      ),
    );
  }

  // Invite member (only owner can call this)
  Future<void> inviteFamilyMember(String familyId, String email) async {
    final currentUserId = client.auth.currentUser!.id;

    // Verify current user is owner (RLS will also check)
    final family = await getFamilyById(familyId);
    if (family.ownerId != currentUserId) {
      throw Exception('Only family owner can invite members');
    }

    // Generate unique token
    final token = generateRandomToken();

    // Create invite
    await client.from('family_invite_links').insert({
      'family_id': familyId,
      'created_by': currentUserId,
      'token': token,
      'email': email,
      'expires_at': DateTime.now().add(Duration(days: 30)).toIso8601String(),
    });

    // TODO: Send email with link: "myorbit.com/join-family/$token"
  }

  // Accept invite (new user or existing user)
  Future<void> acceptFamilyInvite(String token) async {
    final userId = client.auth.currentUser!.id;

    // Get invite
    final inviteResponse = await client
        .from('family_invite_links')
        .select('*, family_groups(*)')
        .eq('token', token)
        .eq('used', false)
        .single();

    if (DateTime.parse(inviteResponse['expires_at']).isBefore(DateTime.now())) {
      throw Exception('Invite link expired');
    }

    final familyId = inviteResponse['family_id'];
    final family = inviteResponse['family_groups'];

    // Check family isn't full
    if (inviteResponse['family_groups']['members'].length >=
        family['max_members']) {
      throw Exception('Family is full');
    }

    // Add user to family
    await client.from('family_members').insert({
      'family_id': familyId,
      'user_id': userId,
      'role': 'member',
      'invited_by': inviteResponse['created_by'],
    });

    // Update profiles.family_id
    await client
        .from('profiles')
        .update({'family_id': familyId}).eq('id', userId);

    // Mark invite as used
    await client
        .from('family_invite_links')
        .update({'used': true}).eq('token', token);
  }
}

// UI Layer (simplified)
class FamilyManagementScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final familyAsync = ref.watch(currentUserFamilyProvider);

    return familyAsync.when(
      loading: () => LoadingWidget(),
      error: (err, stack) => ErrorWidget(error: err),
      data: (family) {
        if (family == null) {
          return CreateFamilyButton(); // User not in family yet
        }

        return Column(
          children: [
            Text('Family: ${family.name}'),
            Text('Members: ${family.members.length}/${family.maxMembers}'),
            
            // Show members
            ListView.builder(
              itemCount: family.members.length,
              itemBuilder: (context, index) {
                final member = family.members[index];
                return ListTile(
                  title: Text(member.role == 'owner' ? '👑 ${member.name}' : member.name),
                );
              },
            ),

            // Show invite button only for owner
            if (family.ownerId == currentUser.id)
              ElevatedButton(
                onPressed: () => showInviteDialog(),
                child: Text('Invite Family Member'),
              ),
          ],
        );
      },
    );
  }
}
```

---

## Part 5: Step-by-Step Implementation Timeline

### Phase 1: Planning (Week 1)
- [ ] Choose between Option A, B, or C
- [ ] Design database schema (use examples above)
- [ ] Plan payment processor integration (Stripe vs. Paddle)
- [ ] Create wireframes for invite flow

### Phase 2: Database Setup (Week 2)
- [ ] Create family_groups table
- [ ] Create family_members table
- [ ] Create family_invite_links table
- [ ] Update profiles table
- [ ] Write RLS policies
- [ ] Test policies with different users

### Phase 3: Backend Functions (Week 3)
- [ ] Stripe integration (create customers, subscriptions)
- [ ] Invite link generation
- [ ] Email sending (AWS SES or similar)
- [ ] Webhook handlers (Stripe payment events)

### Phase 4: App Features (Week 4)
- [ ] Create Family service (FamilyService)
- [ ] Build UI screens (create family, invite, manage)
- [ ] Implement accept invite flow
- [ ] Show family members in calendar
- [ ] Billing/subscription management screen

### Phase 5: Testing & Launch (Week 5)
- [ ] Unit tests for FamilyService
- [ ] Integration tests with Stripe
- [ ] UAT with real payments
- [ ] Launch to staging first
- [ ] Beta test with real family

**Total effort:** 3-4 weeks with dedicated developer

---

## Part 6: Cost Breakdown

### One-Time Development Cost

| Task | Hours | Cost (@ $50/hr) |
|------|-------|-----------------|
| Planning & design | 8 | $400 |
| Database setup | 6 | $300 |
| Stripe integration | 10 | $500 |
| App features | 16 | $800 |
| Testing & bug fixes | 10 | $500 |
| **Total** | **50** | **$2,500** |

### Ongoing Monthly Costs

| Service | Cost | Notes |
|---------|------|-------|
| Stripe | 2.9% + $0.30/transaction | Industry standard |
| Supabase | $25-100+ | Depending on usage |
| Email service | $10-20 | AWS SES or Mailgun |
| **Total** | $50-120 | Scales with users |

### When to Build This
- ✅ After you have 500+ users
- ✅ After you confirm demand for family plans
- ✅ When you need $X more revenue/month to justify dev time

---

## Part 7: Decision Matrix

| Scenario | Recommended | Why |
|----------|-------------|-----|
| Launching MVP | ❌ Skip this | Focus on core calendar features |
| 100 paying users | ⏳ Plan it | Start design, prepare DB |
| 500 paying users | ✅ Build it | ROI clear, demand proven |
| Multiple family requests | ✅ Prioritize | Users want it, revenue opportunity |
| Hiring first dev | ✅ Good project | ~3 weeks of focused work |

---

## Summary: What Goes Where

| Component | Supabase | App Code | Notes |
|-----------|----------|----------|-------|
| Family groups table | ✅ | - | Stores family data |
| Family members table | ✅ | - | Stores member list + roles |
| Invite links table | ✅ | - | Tracks who's been invited |
| family_id in profiles | ✅ | - | Quick lookup for user |
| RLS policies | ✅ | - | Security enforcement |
| UI screens | - | ✅ | Invite flow, member list |
| Stripe integration | - | ✅ | Backend functions handle billing |
| Business logic | ⚠️ | ✅ | DB constrains, app decides UI |
| Email sending | - | ✅ (or backend) | Invite notifications |
| Invite validation | - | ✅ | Check token, expiry, capacity |

**Rule:** Database enforces rules, App enforces UX.

---

## Next Steps

1. **Now:** Don't build anything (MVP first)
2. **At 100 users:** Read this document again, share with dev team
3. **At 500 users:** Start development using Option B
4. **During development:** Follow the code examples above
5. **After launch:** Monitor Stripe dashboard, optimize billing

---

**Questions for Your Dev Team:**
- Would you prefer Option A (simple), Option B (hybrid/secure), or Option C (Stripe-centric)?
- Do you want to use Stripe or a different payment processor?
- When should we actually start building this?

---

**Document Owner:** Founder  
**Last Updated:** October 2025  
**Review When:** You hit 100 paying users
