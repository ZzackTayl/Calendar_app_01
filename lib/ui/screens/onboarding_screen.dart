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

  TextStyle _headlineStyle(BuildContext context, {double? fontSize}) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final base = theme.textTheme.headlineSmall ?? const TextStyle();
    return base.copyWith(
      fontSize: fontSize ?? base.fontSize,
      fontWeight: FontWeight.w700,
      color: palette.textPrimary,
    );
  }

  TextStyle _bodyStyle(
    BuildContext context, {
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? height,
  }) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final base = theme.textTheme.bodyMedium ?? const TextStyle();
    return base.copyWith(
      fontSize: fontSize ?? base.fontSize,
      fontWeight: fontWeight ?? base.fontWeight,
      color: color ?? palette.textSecondary,
      height: height ?? base.height,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradient = AppGradients.backgroundFor(theme.brightness);
    final onboardingState = ref.watch(onboardingProvider);
    final onboardingNotifier = ref.read(onboardingProvider.notifier);

    ref.listen(onboardingProvider, (previous, next) {
      if (!mounted) return;
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
        decoration: BoxDecoration(
          gradient: gradient,
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
    final palette = AppPalette.of(context);
    final textStyle = Theme.of(context)
        .textTheme
        .bodyLarge
        ?.copyWith(color: palette.textPrimary, fontWeight: FontWeight.w600);
    final secondaryStyle = Theme.of(context)
        .textTheme
        .bodyLarge
        ?.copyWith(color: palette.textSecondary, fontWeight: FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          if (state.currentStep > 0)
            IconButton(
              onPressed: () => notifier.handleBack(),
              icon: const Icon(Icons.arrow_back_ios_new_rounded),
              color: palette.textPrimary,
            ),
          if (state.currentStep == 0)
            TextButton(
              onPressed: () => notifier.handleBack(),
              child: Text('Back', style: textStyle),
            ),
          const Spacer(),
          TextButton(
            onPressed: () => notifier.handleNext(),
            child: Text('Skip', style: secondaryStyle),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(OnboardingState state) {
    final palette = AppPalette.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: LinearProgressIndicator(
        value: (state.currentStep + 1) / 8,
        backgroundColor: palette.subtleSurface,
        valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
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
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final primaryButtonColor = state.googleConnected
        ? AppColors.onboardingSuccess
        : AppColors.onboardingGoogle;
    const successColor = Color(0xFF22C55E);

    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: palette.surface,
              borderRadius: BorderRadius.circular(60),
              boxShadow: [
                BoxShadow(
                  color: palette.cardShadow,
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
          Text(
            'Welcome to MyOrbit',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: palette.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Your consent-aware calendar for complex social networks',
            style: textTheme.bodyLarge?.copyWith(
              color: palette.textSecondary,
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
                backgroundColor: primaryButtonColor,
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
                color: palette.highlightFor(successColor),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: successColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Google Calendar connected successfully!',
                      style: textTheme.bodyMedium?.copyWith(
                        color: successColor,
                        fontWeight: FontWeight.w600,
                      ),
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
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
          ),
          const SizedBox(height: 40),
          Text(
            'Syncing Your Calendar',
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: palette.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'We\'re securely importing your events and setting up your privacy preferences.',
            style: textTheme.bodyMedium?.copyWith(
              color: palette.textSecondary,
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
              color: AppColors.eventPurple.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.people,
              size: 50,
              color: AppColors.eventPurple,
            ),
          ),
          const SizedBox(height: 40),
          Text(
            'Your Space, Your Rules',
            style: _headlineStyle(context, fontSize: 28),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'MyOrbit gives you complete control over who sees what. Your privacy settings can be adjusted anytime.',
            style: _bodyStyle(context, fontSize: 16),
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
          Text(
            'Invite your circle',
            style: _headlineStyle(context, fontSize: 28),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Signals shine when trusted partners are connected. Choose whether to send invites now or finish setup first.',
            style: _bodyStyle(context, fontSize: 16),
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
            Text(
              'You can always invite people from the People tab once you’re ready.',
              style: _bodyStyle(context, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactPermissionStep(
      OnboardingNotifier notifier, OnboardingState state) {
    final palette = AppPalette.of(context);
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
          Text(
            'Import trusted contacts?',
            style: _headlineStyle(context, fontSize: 26),
          ),
          const SizedBox(height: 12),
          Text(
            'We can look at your device contacts to suggest people you already coordinate with. Data stays on device unless you invite them.',
            style: _bodyStyle(context, fontSize: 15, height: 1.4),
          ),
          const SizedBox(height: 20),
          SwitchListTile.adaptive(
            value: state.allowContactAccess,
            title: Text(
              'Allow contact suggestions',
              style: _bodyStyle(context,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: palette.textPrimary),
            ),
            subtitle: Text(
              'MyOrbit will surface your accepted contacts and never message anyone without your confirmation.',
              style: _bodyStyle(context, fontSize: 14, height: 1.4),
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
            child: Text(
              'Tip: you can also add partners manually if you prefer not to sync contacts.',
              style: _bodyStyle(
                context,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.permissionOrange,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerSelectionStep(
      OnboardingNotifier notifier, OnboardingState state) {
    final palette = AppPalette.of(context);
    if (state.invitePartnersLater) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'You chose to skip invites for now. Continue to finish onboarding.',
              style: _bodyStyle(context, fontSize: 16),
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
            Icon(Icons.person_add_disabled,
                size: 48, color: palette.textSecondary),
            const SizedBox(height: 16),
            Text(
              'Contact sync is turned off. You can invite people manually later from the People tab.',
              style: _bodyStyle(context, fontSize: 16),
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
          Text(
            'Select partners to invite',
            style: _headlineStyle(context, fontSize: 24),
          ),
          const SizedBox(height: 8),
          Text(
            'Pick the people who should see your availability. We’ll send them your chosen invite method next.',
            style: _bodyStyle(context, fontSize: 15, height: 1.4),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppPalette.of(context).surface,
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
            Text(
              'Choose invite method',
              style: _headlineStyle(context, fontSize: 24),
            ),
            const SizedBox(height: 12),
            Text(
              'We’ll send a personal message when you finish onboarding.',
              style: _bodyStyle(context, fontSize: 15),
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
          Text(
            'All Set!',
            style: _headlineStyle(context, fontSize: 32),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Welcome to your consent-aware calendar. You can now start managing your schedule with privacy and control.',
            style: _bodyStyle(context, fontSize: 16, height: 1.4),
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
                style: _bodyStyle(context, fontSize: 14, height: 1.4),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
