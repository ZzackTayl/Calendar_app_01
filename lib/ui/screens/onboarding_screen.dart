import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme_constants.dart';
import '../../domain/contact.dart';
import '../../logic/providers/onboarding_provider.dart';
import '../../logic/services/dev_data_service.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  late final List<Contact> _eligiblePartners;
  final TextEditingController _inviteMessageController = TextEditingController(
    text:
        'Excited to coordinate with you on MyOrbit! Feel free to invite me when you plan something.',
  );

  @override
  void initState() {
    super.initState();
    _eligiblePartners = DevDataService.getMockContacts()
        .where((contact) =>
            contact.status == ContactStatus.accepted &&
            contact.externalUserId != null)
        .toList();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _inviteMessageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final onboardingState = ref.watch(onboardingProvider);
    final onboardingNotifier = ref.read(onboardingProvider.notifier);

    ref.listen(onboardingProvider, (previous, next) {
      if (previous?.snackBarMessage != next.snackBarMessage &&
          next.snackBarMessage != null) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(next.snackBarMessage!)));
        onboardingNotifier.clearSnackBarMessage();
      }
      if (previous?.navigationRoute != next.navigationRoute &&
          next.navigationRoute != null) {
        context.go(next.navigationRoute!);
        onboardingNotifier.clearNavigationRoute();
      }
      if (previous?.currentStep != next.currentStep) {
        _pageController.animateToPage(
          next.currentStep,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppGradients.background,
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(onboardingNotifier, onboardingState),
              _buildProgressIndicator(onboardingState),
              const SizedBox(height: 20),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (index) {
                    onboardingNotifier.setCurrentStep(index);
                  },
                  children: [
                    _buildWelcomeStep(onboardingNotifier, onboardingState),
                    _buildSyncingStep(),
                    _buildSetupStep(),
                    _buildPartnerIntroStep(onboardingNotifier, onboardingState),
                    _buildContactPermissionStep(
                        onboardingNotifier, onboardingState),
                    _buildPartnerSelectionStep(
                        onboardingNotifier, onboardingState),
                    _buildInviteMethodStep(onboardingNotifier, onboardingState),
                    _buildCompleteStep(onboardingState),
                  ],
                ),
              ),
              _buildNavigation(onboardingNotifier, onboardingState),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(OnboardingNotifier notifier, OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          if (state.currentStep > 0)
            IconButton(
              onPressed: () => notifier.handleBack(),
              icon: const Icon(Icons.arrow_back_ios_new_rounded),
              color: AppColors.textPrimary,
            ),
          if (state.currentStep == 0)
            TextButton(
              onPressed: () => notifier.handleBack(),
              child: const Text(
                'Back',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const Spacer(),
          TextButton(
            onPressed: () => notifier.handleNext(),
            child: const Text(
              'Skip',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: LinearProgressIndicator(
        value: (state.currentStep + 1) / 8,
        backgroundColor: Colors.white.withValues(alpha: 0.3),
        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
      ),
    );
  }

  Widget _buildNavigation(OnboardingNotifier notifier, OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: notifier.canProceed ? () => notifier.handleNext() : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
          child: Text(
            state.currentStep == 7 ? 'Get Started' : 'Continue',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeStep(OnboardingNotifier notifier, OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(60),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: const Icon(
              Icons.calendar_today,
              size: 60,
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'Welcome to MyOrbit',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'Your consent-aware calendar for complex social networks',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: state.isConnecting
                  ? null
                  : () => notifier.connectGoogleCalendar(),
              icon: state.isConnecting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.login),
              label: Text(state.isConnecting
                  ? 'Connecting...'
                  : 'Connect Google Calendar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: state.googleConnected
                    ? AppColors.onboardingSuccess
                    : AppColors.onboardingGoogle,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (state.googleConnected) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Google Calendar connected successfully!',
                      style: TextStyle(
                          color: Colors.green, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSyncingStep() {
    return const Padding(
      padding: EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
          ),
          SizedBox(height: 40),
          Text(
            'Syncing Your Calendar',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 16),
          Text(
            'We\'re securely importing your events and setting up your privacy preferences.',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSetupStep() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.eventPurple.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.people,
              size: 50,
              color: AppColors.eventPurple,
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'Your Space, Your Rules',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'MyOrbit gives you complete control over who sees what. Your privacy settings can be adjusted anytime.',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerIntroStep(
      OnboardingNotifier notifier, OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.signalAvailable.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.group_add_outlined,
              size: 48,
              color: AppColors.signalAvailable,
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'Invite your circle',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Signals shine when trusted partners are connected. Choose whether to send invites now or finish setup first.',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 28),
          Wrap(
            spacing: 12,
            children: [
              ChoiceChip(
                label: const Text('Invite partners now'),
                selected: !state.invitePartnersLater,
                onSelected: (selected) {
                  notifier.setInvitePartnersLater(!selected);
                },
              ),
              ChoiceChip(
                label: const Text('I’ll do this later'),
                selected: state.invitePartnersLater,
                onSelected: (selected) {
                  notifier.setInvitePartnersLater(selected);
                },
              ),
            ],
          ),
          if (state.invitePartnersLater) ...[
            const SizedBox(height: 12),
            const Text(
              'You can always invite people from the People tab once you’re ready.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactPermissionStep(
      OnboardingNotifier notifier, OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.permissionOrangeLight,
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Icon(
              Icons.lock_open_rounded,
              color: AppColors.permissionOrange,
              size: 40,
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            'Import trusted contacts?',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'We can look at your device contacts to suggest people you already coordinate with. Data stays on device unless you invite them.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 20),
          SwitchListTile.adaptive(
            value: state.allowContactAccess,
            title: const Text('Allow contact suggestions'),
            subtitle: const Text(
              'MyOrbit will surface your accepted contacts and never message anyone without your confirmation.',
            ),
            onChanged: (value) {
              notifier.setAllowContactAccess(value);
            },
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.permissionOrangeBg,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Tip: you can also add partners manually if you prefer not to sync contacts.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.permissionOrange,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerSelectionStep(
      OnboardingNotifier notifier, OnboardingState state) {
    if (state.invitePartnersLater) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'You chose to skip invites for now. Continue to finish onboarding.',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => notifier.handleNext(),
              child: const Text('Continue'),
            ),
          ],
        ),
      );
    }

    if (!state.allowContactAccess || _eligiblePartners.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(Icons.person_add_disabled,
                size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Contact sync is turned off. You can invite people manually later from the People tab.',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => notifier.handleNext(),
              child: const Text('Skip for now'),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          const Text(
            'Select partners to invite',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pick the people who should see your availability. We’ll send them your chosen invite method next.',
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(20),
              ),
              child: ListView.builder(
                itemCount: _eligiblePartners.length,
                itemBuilder: (context, index) {
                  final contact = _eligiblePartners[index];
                  final isSelected =
                      state.selectedPartnerIds.contains(contact.id);
                  return CheckboxListTile(
                    title: Text(contact.name),
                    subtitle: contact.email != null
                        ? Text(contact.email!)
                        : (contact.phoneNumber != null
                            ? Text(contact.phoneNumber!)
                            : null),
                    value: isSelected,
                    onChanged: (value) {
                      notifier.togglePartnerSelection(contact.id);
                    },
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => notifier.handleNext(),
              child: const Text('Skip invites for now'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInviteMethodStep(
      OnboardingNotifier notifier, OnboardingState state) {
    final selectedContacts = _eligiblePartners
        .where((contact) => state.selectedPartnerIds.contains(contact.id))
        .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 32),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Choose invite method',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'We’ll send a personal message when you finish onboarding.',
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            if (selectedContacts.isNotEmpty) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: selectedContacts
                    .map(
                      (contact) => Chip(
                        label: Text(contact.name),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
            RadioGroup<InviteMethod>(
              groupValue: state.inviteMethod,
              onChanged: (value) {
                if (value != null) {
                  notifier.setInviteMethod(value);
                }
              },
              child: Column(
                children: [
                  RadioListTile<InviteMethod>(
                    value: InviteMethod.shareLink,
                    title: const Text('Share secure link'),
                    subtitle: const Text(
                        'Send a one-time link they can accept whenever they are ready.'),
                  ),
                  RadioListTile<InviteMethod>(
                    value: InviteMethod.email,
                    title: const Text('Email invitation'),
                    subtitle: const Text(
                        'We’ll send an email with your note and instructions.'),
                  ),
                  RadioListTile<InviteMethod>(
                    value: InviteMethod.sms,
                    title: const Text('Text message'),
                    subtitle: const Text(
                        'Perfect for quick coordination with close contacts.'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _inviteMessageController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Personal message',
                border: OutlineInputBorder(),
                hintText: 'Add context so they know why you’re inviting them.',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompleteStep(OnboardingState state) {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.check_circle,
              size: 50,
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'All Set!',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'Welcome to your consent-aware calendar. You can now start managing your schedule with privacy and control.',
            style: TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          if (!state.invitePartnersLater &&
              state.selectedPartnerIds.isNotEmpty) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'We’ll send ${state.selectedPartnerIds.length} invite${state.selectedPartnerIds.length == 1 ? '' : 's'} using ${state.inviteMethod.toString().split('.').last} once you tap Get Started.',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
