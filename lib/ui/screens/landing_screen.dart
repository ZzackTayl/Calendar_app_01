import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme_constants.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';

/// Marketing landing page that mirrors the latest Figma facelift.
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  static const _features = [
    _FeatureCardData(
      iconPath: 'icons/landingpage_icon_lock.webp',
      title: 'Consent-First Privacy',
      description:
          'Granular permission controls ensure connections only see what you choose to share',
    ),
    _FeatureCardData(
      iconPath: 'icons/Landingpage_icon_connections.webp',
      title: 'Multi-Connection Management',
      description: 'Seamlessly coordinate schedules across all your relationships with clarity',
    ),
    _FeatureCardData(
      iconPath: 'icons/landingpage_icon_logo.webp',
      title: 'Smart Scheduling',
      description: 'Avoid conflicts and find quality time with integrated calendar sync',
    ),
    _FeatureCardData(
      iconPath: 'icons/landingpage_icon_heart.webp',
      title: 'Relationship Focused',
      description: 'Built specifically for polyamorous and ethically non-monogamous communities',
    ),
  ];

  static const _steps = [
    _StepData(
      number: '1',
      title: 'Connect Your Calendar',
      description: 'Sync with Google Calendar or add events manually',
    ),
    _StepData(
      number: '2',
      title: 'Add Your Relationships',
      description: 'Invite relationships and set individual permission levels',
    ),
    _StepData(
      number: '3',
      title: 'Share Mindfully',
      description: 'Control exactly what each relationship can see',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.landingBackground),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const _HeroSection(),
                    const SizedBox(height: 40),
                    const _SectionHeader('Why MyOrbit?'),
                    const SizedBox(height: 20),
                    Column(
                      children: _features
                          .map((feature) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                child: _FeatureCard(data: feature),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 36),
                    const _SectionHeader('How It Works'),
                    const SizedBox(height: 20),
                    Column(
                      children: _steps
                          .map((step) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                child: _HowItWorksStep(data: step),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 44),
                    const _BottomCta(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection();

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final logoAsset = AppAssets.logoForBrightness(brightness);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SemanticImage(
          label: 'MyOrbit logo',
          child: Image.asset(
            logoAsset,
            width: 360,
            height: 360,
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'The app designed to help you stay connected',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: SemanticButton(
            label: 'Sign up for early access',
            hint: 'Navigate to the onboarding screen',
            onPressed: () => context.go('/onboarding'),
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppGradients.accent,
                borderRadius: BorderRadius.circular(28),
                boxShadow: AppShadows.button,
              ),
              child: TextButton(
                onPressed: () => context.go('/onboarding'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Sign up for early access'),
                    SizedBox(width: 12),
                    Icon(Icons.arrow_forward_rounded, size: 22),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'You decide who sees what. Coordinate time with privacy and equity.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            color: AppColors.textSecondary,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.data});

  final _FeatureCardData data;

  @override
  Widget build(BuildContext context) {
    return SemanticCard(
      label: data.title,
      hint: data.description,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadowColor,
              blurRadius: 22,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Image.asset(
                data.iconPath,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    data.description,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HowItWorksStep extends StatelessWidget {
  const _HowItWorksStep({required this.data});

  final _StepData data;

  @override
  Widget build(BuildContext context) {
    return SemanticCard(
      label: 'Step ${data.number}: ${data.title}',
      hint: data.description,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              gradient: AppGradients.accent,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              data.number,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  data.description,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: AppColors.textSecondary,
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

class _BottomCta extends StatelessWidget {
  const _BottomCta();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const Text(
          'Ready to Transform Your Scheduling?',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: SemanticButton(
            label: 'Get Early Access Now',
            hint: 'Navigate to the onboarding screen',
            onPressed: () => context.go('/onboarding'),
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppGradients.accent,
                borderRadius: BorderRadius.circular(30),
                boxShadow: AppShadows.button,
              ),
              child: TextButton(
                onPressed: () => context.go('/onboarding'),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: const Text('Get Early Access Now'),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Free during beta • No credit card required',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          '© 2024 MyOrbit • Privacy Policy • Terms',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return SemanticHeading(
      label: title,
      child: Text(
        title,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
}

class _FeatureCardData {
  const _FeatureCardData({
    required this.iconPath,
    required this.title,
    required this.description,
  });

  final String iconPath;
  final String title;
  final String description;
}

class _StepData {
  const _StepData({
    required this.number,
    required this.title,
    required this.description,
  });

  final String number;
  final String title;
  final String description;
}
