import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_contacts/flutter_contacts.dart' as fc;

import '../../core/theme_constants.dart';
import '../../l10n/app_localizations.dart';
import '../../domain/contact.dart';
import '../../logic/providers/onboarding_provider.dart';
import '../../logic/providers/auth_providers.dart';
import '../widgets/contact_invite_mode_row.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  List<Contact> _realContacts = [];
  bool _permissionDenied = false;
  bool _isLoadingContacts = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchContacts();
    });
  }

  Future<void> _fetchContacts() async {
    final ownerId = ref.read(currentUserProvider)?.id;
    if (ownerId == null) {
      setState(() {
        _permissionDenied = true;
        _isLoadingContacts = false;
      });
      return;
    }

    if (!await fc.FlutterContacts.requestPermission()) {
      setState(() {
        _permissionDenied = true;
        _isLoadingContacts = false;
      });
      return;
    }
    final contacts = await fc.FlutterContacts.getContacts(withProperties: true);
    setState(() {
      _realContacts = contacts
          .map((c) => Contact(
                id: c.id,
                name: c.displayName,
                email: c.emails.isNotEmpty ? c.emails.first.address : null,
                phoneNumber: c.phones.isNotEmpty ? c.phones.first.number : null,
                status: ContactStatus.contactOnly,
                permission: PartnerPermission.private,
                ownerId: ownerId,
              ))
          .toList();
      _isLoadingContacts = false;
    });
  }

  Widget _buildInviteModeInfoCard({
    required IconData icon,
    required String title,
    required String description,
    required Color color,
    required Color background,
  }) {
    final palette = AppPalette.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: _headlineStyle(context, fontSize: 18),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: _bodyStyle(context,
                      fontSize: 14, color: palette.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
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
    final gradient = theme.brightness == Brightness.dark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A1C24), Color(0xFF252837)],
          )
        : AppGradients.backgroundFor(theme.brightness);
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
                    _buildPartnerIntroStep(onboardingNotifier, onboardingState),
                    _buildContactPermissionStep(
                        onboardingNotifier, onboardingState),
                    _buildPartnerSelectionStep(
                        onboardingNotifier, onboardingState),
                    _buildPartnerInviteModeStep(
                        onboardingNotifier, onboardingState),
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
              tooltip: 'Go back',
            ),
          if (state.currentStep == 0)
            TextButton(
              onPressed: () => notifier.handleBack(),
              child: Text(
                AppLocalizations.of(context).onboardingBackButton,
                style: textStyle,
              ),
            ),
          const Spacer(),
          TextButton(
            onPressed: () => notifier.handleNext(),
            child: Text(
              AppLocalizations.of(context).onboardingSkipButton,
              style: secondaryStyle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(OnboardingState state) {
    final palette = AppPalette.of(context);
    final colorScheme = Theme.of(context).colorScheme;
    final totalSteps = OnboardingNotifier.totalSteps;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Step ${state.currentStep + 1} of $totalSteps',
            style: _bodyStyle(
              context,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: palette.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (state.currentStep + 1) / totalSteps,
            backgroundColor: palette.subtleSurface,
            valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
          ),
        ],
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
            state.currentStep == OnboardingNotifier.totalSteps - 1
                ? 'Get Started'
                : 'Continue',
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
    const successColor = AppColors.onboardingSuccess;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
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
            'Signals shine when trusted connections are added. Choose whether to send invites now or finish setup first.',
            style: _bodyStyle(context, fontSize: 16),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 28),
          Wrap(
            spacing: 12,
            children: [
              ChoiceChip(
                label: Text(
                  AppLocalizations.of(context).onboardingInviteNow,
                ),
                selected: !state.invitePartnersLater,
                onSelected: (selected) {
                  notifier.setInvitePartnersLater(!selected);
                },
              ),
              ChoiceChip(
                label: Text(
                  AppLocalizations.of(context).onboardingInviteLater,
                ),
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
              "You can always invite people from the People tab once you're ready.",
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
              'Tip: you can also add connections manually if you prefer not to sync contacts.',
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
              child: Text(
                AppLocalizations.of(context).onboardingContinueButton,
              ),
            ),
          ],
        ),
      );
    }

    if (_isLoadingContacts) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_permissionDenied) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: palette.textSecondary),
            const SizedBox(height: 16),
            Text(
              'Contact permission was denied. You can enable it in your device settings.',
              style: _bodyStyle(context, fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    if (_realContacts.isEmpty) {
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
              'No contacts found on your device. You can invite people manually later from the People tab.',
              style: _bodyStyle(context, fontSize: 16),
              textAlign: TextAlign.center,
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
            'Select connections to invite',
            style: _headlineStyle(context, fontSize: 24),
          ),
          const SizedBox(height: 8),
          Text(
            "Pick the people who should see your availability. You'll choose how to add each person next.",
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
                itemCount: _realContacts.length,
                itemBuilder: (context, index) {
                  final contact = _realContacts[index];
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
              child: Text(
                AppLocalizations.of(context).onboardingSkipInvites,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartnerInviteModeStep(
      OnboardingNotifier notifier, OnboardingState state) {
    if (state.invitePartnersLater || state.selectedPartnerIds.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(Icons.pending_actions,
                size: 48, color: AppPalette.of(context).textSecondary),
            const SizedBox(height: 16),
            Text(
              'No connection visibility to configure right now. You can always adjust visibility settings later from People.',
              style: _bodyStyle(context, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => notifier.handleNext(),
              child: Text(
                AppLocalizations.of(context).onboardingContinueButton,
              ),
            ),
          ],
        ),
      );
    }

    final palette = AppPalette.of(context);
    final selectedContacts = _realContacts
        .where((contact) => state.selectedPartnerIds.contains(contact.id))
        .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'How should we add them?',
            style: _headlineStyle(context, fontSize: 26),
          ),
          const SizedBox(height: 8),
          Text(
            "Choose how you'd like to connect with each selected connection.",
            style: _bodyStyle(context, fontSize: 15),
          ),
          const SizedBox(height: 20),
          _buildInviteModeInfoCard(
            icon: Icons.calendar_today,
            title: 'Add as contacts for reference',
            description: 'No app access, just for event references',
            color: AppColors.activityBlue,
            background: AppColors.activityBlueLight,
          ),
          const SizedBox(height: 12),
          _buildInviteModeInfoCard(
            icon: Icons.person_add_alt_1,
            title: 'Invite them to the app',
            description: 'Send invitation for full calendar sharing',
            color: AppColors.activityPurple,
            background: AppColors.activityPurpleLight,
          ),
          const SizedBox(height: 24),
          Text(
            "You've selected:",
            style: _bodyStyle(
              context,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: selectedContacts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final contact = selectedContacts[index];
                final inviteMode = state.partnerInviteModes[contact.id];
                return ContactInviteModeRow(
                  contact: contact,
                  selectedMode: inviteMode,
                  onModeSelected: (mode) {
                    notifier.setPartnerInviteMode(contact.id, mode);
                  },
                );
              },
            ),
          ),
        ],
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
                _buildCompletionSummary(state),
                style: _bodyStyle(context, fontSize: 14, height: 1.4),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _buildCompletionSummary(OnboardingState state) {
    final appInvites = state.partnerInviteModes.values
        .where((mode) => mode == PartnerInviteMode.appInvitation)
        .length;
    final referenceContacts = state.partnerInviteModes.values
        .where((mode) => mode == PartnerInviteMode.referenceContact)
        .length;

    final parts = <String>[];
    if (appInvites > 0) {
      parts.add('$appInvites app invite${appInvites == 1 ? '' : 's'}');
    }
    if (referenceContacts > 0) {
      parts.add(
          '$referenceContacts reference contact${referenceContacts == 1 ? '' : 's'}');
    }

    final summary = parts.join(parts.length > 1 ? ' and ' : '');
    if (summary.isEmpty) {
      return 'You can fine-tune these connection settings later from People.';
    }
    return "We'll confirm $summary as soon as you tap Get Started.";
  }
}
