# Repository Ownership Change - October 24, 2025

## Overview
The MyOrbit Calendar repository has been transferred to new ownership under the MyOrbitCalendar organization.

## Changes Made

### Repository Location
- **Old**: `https://github.com/ZzackTayl/Calendar_Mobile`
- **New**: `https://github.com/MyOrbitCalendar/MyOrbit`

### Updated Files
1. **Git Remote Configuration**
   - Remote URL updated to new repository location
   - All git operations now point to new repository

2. **README.md**
   - Title updated from "Calendar_Mobile" to "MyOrbit Calendar"
   - All content and documentation preserved

3. **pubspec.yaml**
   - Package name changed from `myorbit_calendar` to `myorbit`
   - All dependencies and configuration maintained

4. **Developer Guide**
   - Updated directory reference in `docs/guides/DEVELOPER_GUIDE.md`
   - Changed `cd Calendar_Mobile` to `cd MyOrbit`

## Impact on Development Team

### ✅ No Action Required
- All existing code and functionality remains unchanged
- Development workflow continues as normal
- All documentation and setup instructions remain valid

### 🔄 For Existing Developers
1. **Update Local Repository** (if you have existing clones):
   ```bash
   git remote set-url origin https://github.com/MyOrbitCalendar/MyOrbit.git
   ```

2. **Verify Connection**:
   ```bash
   git remote -v
   git fetch origin
   ```

### 📋 For New Team Members
- Clone from new repository: `git clone https://github.com/MyOrbitCalendar/MyOrbit.git`
- Follow existing setup instructions in `docs/setup/`
- All development tools and processes remain the same

## Technical Details

### Repository Structure
- All existing branches preserved
- Complete commit history maintained
- All tags and releases preserved
- All issues and pull requests transferred

### Development Environment
- No changes to Flutter/Dart setup required
- All dependencies remain the same
- Build processes unchanged
- CI/CD pipelines will need to be updated to new repository

## Next Steps

1. **Update CI/CD**: Update any GitHub Actions or deployment scripts to use new repository URL
2. **Update Documentation**: Any external documentation referencing the old repository should be updated
3. **Team Communication**: Ensure all team members are aware of the new repository location
4. **Access Permissions**: Verify all team members have appropriate access to the new repository

## Support
- All existing development resources remain available
- Documentation in `docs/` folder is current and accurate
- Setup guides in `docs/setup/` provide complete onboarding instructions

---
*This change was implemented on October 24, 2025*
