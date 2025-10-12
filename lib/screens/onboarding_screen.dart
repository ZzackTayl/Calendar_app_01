import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/user_provider.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isConnecting = false;
  bool _googleConnected = false;
  bool _wantsToInvite = true;

  final Map<String, _PartnerSetup> _selectedPartners = {};

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _connectGoogleCalendar() async {
    if (_isConnecting) return;
    setState(() {
      _isConnecting = true;
    });

    await Future.delayed(const Duration(milliseconds: 900));

    if (!mounted) return;
    setState(() {
      _isConnecting = false;
      _googleConnected = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content:
            Text('Google Calendar connected (mock). Syncing your events...'),
      ),
    );

    // Auto-advance to syncing step after a brief delay
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    _handleNext();
  }

  bool get _isLastStep => _currentStep == 5; // 6 total steps (0-5)

  bool get _canProceed {
    if (_currentStep == 0) {
      return _googleConnected;
    }
    if (_currentStep == 1) {
      return true; // Syncing step - always can proceed
    }
    if (_currentStep == 2) {
      // Moving from "Invite" choice to selection. Always allow; the next step handles validation.
      return true;
    }
    if (_currentStep == 3) {
      // Select Partners step: require at least one selection if the user opted to invite.
      if (!_wantsToInvite) return true;
      return (_selectedPartnerIndices?.isNotEmpty ?? false);
    }
    // Steps 4-6 can always proceed
    return true;
  }

  void _handleNext() {
    if (!_canProceed) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _currentStep == 0
                ? 'Please connect your Google Calendar to continue.'
                : 'Select at least one connection or choose to skip invites.',
          ),
        ),
      );
      return;
    }

    if (_isLastStep) {
      _completeOnboarding();
      return;
    }

    final nextStep = _currentStep + 1;
    setState(() {
      _currentStep = nextStep;
    });
    _pageController.animateToPage(
      nextStep,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );

    // Show appropriate feedback for each step transition
    if (_currentStep == 2) {
      // Moving to syncing step
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Syncing your calendar...'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }

  void _handleBack() {
    if (_currentStep == 0) {
      Navigator.pushReplacementNamed(context, '/landing');
      return;
    }

    final previous = _currentStep - 1;
    setState(() {
      _currentStep = previous;
    });
    _pageController.animateToPage(
      previous,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasOnboarded', true);

    final userProfile = context.read<UserProfileProvider>();
    userProfile.setGoogleConnected(_googleConnected);
    userProfile.replacePartners(_selectedPartners.values.map((setup) {
      final status = setup.mode == InvitationMode.inviteToApp
          ? ConnectionStatus.pendingInvite
          : ConnectionStatus.contactOnly;
      return PartnerProfile(
        id: setup.contact.id,
        name: setup.contact.name,
        relationship: setup.contact.subtitle,
        invitationMode: setup.mode,
        permission: setup.permission,
        status: status,
      );
    }).toList());

    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  bool get _showGlobalContinue {
    // Hide global Continue on steps that have their own primary CTAs
    // 0: Connect, 2: Invite, 5: All set
    return !{0, 2, 5}.contains(_currentStep);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFE6F3FF), Color(0xFFF8E8FF)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                child: Row(
                  children: [
                    if (_currentStep > 0)
                      IconButton(
                        onPressed: _handleBack,
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        color: const Color(0xFF57586E),
                      ),
                    if (_currentStep == 0)
                      TextButton(
                        onPressed: _handleBack,
                        child: const Text('Back'),
                      ),
                    const Spacer(),
                    TextButton(
                      onPressed: () async {
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setBool('hasOnboarded', true);
                        if (!mounted) return;
                        final userProfile = context.read<UserProfileProvider>();
                        userProfile.setGoogleConnected(false);
                        userProfile.replacePartners(const <PartnerProfile>[]);
                        Navigator.pushReplacementNamed(context, '/dashboard');
                      },
                      child: const Text('Skip'),
                    ),
                  ],
                ),
              ),
              _StepIndicator(currentStep: _currentStep, totalSteps: 6),
              const SizedBox(height: 12),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildConnectStep(),
                    _buildSyncingStep(),
                    _buildInviteStep(),
                    _buildSelectPartnersStep(),
                    _buildSummaryStep(),
                    _buildAllSetStep(),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                child: Column(
                  children: [
                    if (_showGlobalContinue) ...[
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _handleNext,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            backgroundColor:
                                const Color(0xFF1F1F39), // Dark blue/black
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          child: Text(
                            _isLastStep
                                ? 'Finish'
                                : (_currentStep == 3 && (_selectedPartnerIndices?.isNotEmpty ?? false)
                                    ? 'Continue (${_selectedPartnerIndices?.length ?? 0})'
                                    : 'Continue'),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_currentStep > 0)
                      TextButton(
                        onPressed: _handleBack,
                        child: const Text('Previous'),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectStep() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 160), // leave room for bottom controls
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 40),

                  // Large calendar icon in center
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F4FD),
                      borderRadius: BorderRadius.circular(60),
                    ),
                    child: const Icon(
                      Icons.calendar_today_outlined,
                      size: 48,
                      color: Color(0xFF4285F4),
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Title
                  const Text(
                    'Connect Google Calendar',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F1F39),
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 16),

                  // Subtitle
                  Text(
                    'We\'ll import your existing events and keep everything in sync',
                    style: TextStyle(
                      fontSize: 16,
                      color: const Color(0xFF5B5A78).withOpacity(0.9),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 48),

                  // Privacy First section
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8E1), // Light yellow/cream background
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Privacy First',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F1F39),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'We only read your calendar data to help you manage your schedule. Your personal information stays private and secure.',
                          style: TextStyle(
                            fontSize: 14,
                            color: const Color(0xFF5B5A78).withOpacity(0.9),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Connect button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _googleConnected ? null : _connectGoogleCalendar,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        backgroundColor: const Color(0xFF4285F4), // Google blue
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: Text(
                        _googleConnected
                            ? 'Google Calendar connected'
                            : 'Connect Google Calendar',
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Skip for now
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _googleConnected = false;
                      });
                      _handleNext();
                    },
                    child: const Text(
                      'Skip for now',
                      style: TextStyle(
                        fontSize: 16,
                        color: Color(0xFF666666),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSyncingStep() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 160),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 40),

                  // Green circular syncing icon
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E8), // Light green background
                      borderRadius: BorderRadius.circular(60),
                    ),
                    child: const Icon(
                      Icons.sync,
                      size: 48,
                      color: Color(0xFF4CAF50), // Green color
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Title
                  const Text(
                    'Syncing Your Calendar',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F1F39),
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 16),

                  // Subtitle
                  Text(
                    'Calendar connected successfully!',
                    style: TextStyle(
                      fontSize: 16,
                      color: const Color(0xFF5B5A78).withOpacity(0.9),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 48),

                  // Success checkmarks box
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E8), // Light green background
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Column(
                      children: [
                        // Calendar connected successfully
                        Row(
                          children: [
                            Icon(
                              Icons.check_circle,
                              color: Color(0xFF4CAF50),
                              size: 20,
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Calendar connected successfully',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1F1F39),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),

                        SizedBox(height: 16),

                        // Imported 12 existing events
                        Row(
                          children: [
                            Icon(
                              Icons.check_circle,
                              color: Color(0xFF4CAF50),
                              size: 20,
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Imported 12 existing events',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1F1F39),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),

                        SizedBox(height: 16),

                        // Real-time sync enabled
                        Row(
                          children: [
                            Icon(
                              Icons.check_circle,
                              color: Color(0xFF4CAF50),
                              size: 20,
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Real-time sync enabled',
                              style: TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1F1F39),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInviteStep() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 160),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 40),

                  // Large purple people icon in a circle
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3E8FF),
                      borderRadius: BorderRadius.circular(60),
                    ),
                    child: const Icon(
                      Icons.groups_rounded,
                      size: 48,
                      color: Color(0xFF9C5BFF),
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Title
                  const Text(
                    'Add Your Partners',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F1F39),
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 16),

                  // Subtitle
                  const Text(
                    'Would you like to add anyone to your calendar for shared scheduling?',
                    style: TextStyle(
                      fontSize: 16,
                      color: Color(0xFF5B5A78),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 40),

                  // Consensual Sharing info box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8F3FF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Consensual Sharing',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF9C5BFF),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'You control exactly what each person can see. Partners can only see what you explicitly share with them.',
                          style: TextStyle(
                            fontSize: 15,
                            color: Color(0xFF9C5BFF),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Add partners button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.person_add_alt_1_rounded,
                          color: Colors.white),
                      label: const Text(
                        'Yes, add partners from contacts',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      ),
              onPressed: () {
                setState(() {
                  _wantsToInvite = true;
                });
                _handleNext();
              },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF9C5BFF),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle:
                            const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                        elevation: 0,
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Skip for now button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
              onPressed: () {
                setState(() {
                  _wantsToInvite = false;
                });
                _handleNext();
              },
              style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        foregroundColor: const Color(0xFF1F1F39),
                        side: const BorderSide(color: Color(0xFFE0E0E0), width: 2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle:
                            const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                      ),
                      child: const Text('Skip for now'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSelectPartnersStep() {
    final contacts = [
      {
        'name': 'Alex Johnson',
        'email': 'alex@example.com',
        'color': Color(0xFF9C5BFF)
      },
      {
        'name': 'Sam Wilson',
        'email': 'sam@example.com',
        'color': Color(0xFFFFB300)
      },
      {
        'name': 'Jordan Smith',
        'email': 'jordan@example.com',
        'color': Color(0xFF26C281)
      },
      {
        'name': 'Riley Chen',
        'email': 'riley@example.com',
        'color': Color(0xFF4285F4)
      },
    ];

    // Use state to track selected indices
    final Set<int> selected = _selectedPartnerIndices ??= <int>{};

    void toggle(int idx) {
      setState(() {
        if (selected.contains(idx)) {
          selected.remove(idx);
        } else {
          selected.add(idx);
        }
      });
    }

    Widget buildContact(Map<String, dynamic> contact, int idx) {
      final initials =
          contact['name'].split(' ').map((e) => e[0]).take(2).join();
      final isSelected = selected.contains(idx);
      return GestureDetector(
        onTap: () => toggle(idx),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFFF8F3FF)
                : Colors.white.withOpacity(0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF9C5BFF)
                  : const Color(0xFFE5E5E5),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF9C5BFF).withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : [],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: contact['color'],
                  borderRadius: BorderRadius.circular(24),
                ),
                alignment: Alignment.center,
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      contact['name'],
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 18,
                        color: Color(0xFF1F1F39),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      contact['email'],
                      style: const TextStyle(
                        color: Color(0xFF5B5A78),
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check, color: Color(0xFF9C5BFF), size: 28),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: Column(
        children: [
          const SizedBox(height: 12),
          // Title
          const Text(
            'Select Partners',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1F1F39),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          // Subtitle
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Choose people from your contacts to add to your calendar',
              style: TextStyle(
                fontSize: 18,
                color: Color(0xFF5B5A78),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 28),
          // Contact cards
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              itemCount: contacts.length,
              itemBuilder: (context, idx) => buildContact(contacts[idx], idx),
            ),
          ),
        ],
      ),
    );
  }

  // Add this field to the state class:
  Set<int>? _selectedPartnerIndices;

  Widget _buildSummaryStep() {
    final hasConnections = _selectedPartners.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 28,
                    offset: Offset(0, 18),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.celebration_rounded, color: Color(0xFF7C3BFF)),
                      SizedBox(width: 12),
                      Text(
                        'You\'re all set!',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F1F39),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _googleConnected
                        ? 'PolyCalendar is connected to Google Calendar and ready to organize your relationships.'
                        : 'You can connect Google Calendar later from Settings.',
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF5B5A78),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (hasConnections) ...[
                    const Text(
                      'Connection permissions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F1F39),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._selectedPartners.values.map((setup) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _SummaryRow(setup: setup),
                      );
                    }),
                  ] else
                    const _InfoPill(
                      icon: Icons.people_outline,
                      color: Color(0xFF9C5BFF),
                      text:
                          'No connections added yet. You can invite partners any time from the dashboard.',
                    ),
                  const SizedBox(height: 20),
                  const Text(
                    'Permission levels',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F1F39),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const _PermissionLegend(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAllSetStep() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 160),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 32),
                  // Large green checkmark
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFE8F5E8), Color(0xFFD6F5E8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(60),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.check, color: Color(0xFF26C281), size: 56),
                  ),
                  const SizedBox(height: 32),
                  // Title
                  const Text(
                    "You're all set!",
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F1F39),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  // Subtitle
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Your PolyCalendar is ready to help you manage your relationships with care and consent.',
                      style: TextStyle(
                        fontSize: 18,
                        color: Color(0xFF5B5A78),
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 32),
                  // What's next card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "What's next:",
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 18,
                              color: Color(0xFF1F1F39),
                            ),
                          ),
                          const SizedBox(height: 16),
                          _nextStepItem('Create your first event'),
                          _nextStepItem('Explore privacy settings'),
                          _nextStepItem('Invite more partners when ready'),
                          _nextStepItem('Set up notification preferences'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Enter Your Calendar button
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pushReplacementNamed(context, '/calendar');
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1F1F39),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          textStyle: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 18),
                          elevation: 0,
                        ),
                        child: const Text('Enter Your Calendar'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _nextStepItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          const Icon(Icons.check, color: Color(0xFF26C281), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF1F1F39),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.setup});

  final _PartnerSetup setup;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF9F9FF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E4F1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF9C5BFF).withOpacity(0.15),
            child: Text(setup.contact.name.characters.first),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  setup.contact.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F1F39),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  setup.contact.subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF5B5A78),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  setup.mode == InvitationMode.inviteToApp
                      ? 'Invited to PolyCalendar'
                      : 'Added as contact only',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9C5BFF),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Permission: ${_permissionLabel(setup.permission)}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF5B5A78),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PermissionLegend extends StatelessWidget {
  const _PermissionLegend();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: ConnectionPermission.values.map((permission) {
        final label = _permissionLabel(permission);
        final description = _permissionDescription(permission);
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 10, color: Color(0xFF9C5BFF)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F1F39),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF5B5A78),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({
    required this.currentStep,
    required this.totalSteps,
  });

  final int currentStep;
  final int totalSteps;

  @override
  Widget build(BuildContext context) {
    final progress = (currentStep + 1) / totalSteps;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Step ${currentStep + 1} of $totalSteps',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF666666),
                ),
              ),
              Text(
                '${(progress * 100).round()}%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF666666),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: const Color(0xFFE5E5E5),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFF666666)),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.icon,
    required this.color,
    required this.text,
  });

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: color.darken(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactSuggestion {
  const _ContactSuggestion({
    required this.id,
    required this.name,
    required this.subtitle,
  });

  final String id;
  final String name;
  final String subtitle;
}

class _PartnerSetup {
  const _PartnerSetup({
    required this.contact,
    required this.mode,
    required this.permission,
  });

  final _ContactSuggestion contact;
  final InvitationMode mode;
  final ConnectionPermission permission;

  _PartnerSetup copyWith({
    InvitationMode? mode,
    ConnectionPermission? permission,
  }) {
    return _PartnerSetup(
      contact: contact,
      mode: mode ?? this.mode,
      permission: permission ?? this.permission,
    );
  }
}

String _permissionLabel(ConnectionPermission permission) {
  switch (permission) {
    case ConnectionPermission.private:
      return 'Private';
    case ConnectionPermission.semiVisible:
      return 'Semi-visible';
    case ConnectionPermission.visible:
      return 'Visible';
  }
}

String _permissionDescription(ConnectionPermission permission) {
  switch (permission) {
    case ConnectionPermission.private:
      return 'Hidden unless invited to an event.';
    case ConnectionPermission.semiVisible:
      return 'Sees your busy slots without details.';
    case ConnectionPermission.visible:
      return 'Full event details unless marked private.';
  }
}

extension on Color {
  Color darken([double amount = .2]) {
    final hsl = HSLColor.fromColor(this);
    final lightness = (hsl.lightness - amount).clamp(0.0, 1.0);
    return hsl.withLightness(lightness).toColor();
  }
}
