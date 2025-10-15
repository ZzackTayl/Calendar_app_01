import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme_constants.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppGradients.landingBackground),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _buildHeroSection(context),
                    const SizedBox(height: 36),
                    const _ChallengeSection(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Image.asset(
          'icons/Calendar_Icon_wood.png',
          width: 96,
          height: 96,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 28),
        const _GradientText(
          'MyOrbit',
          gradient: AppGradients.accent,
          style: TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'The calendar app designed for ethical non-monogamy',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.landingTextPrimary,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Manage multiple relationships with consent, clarity, and care',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            color: AppColors.landingTextSecondary,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 32),
        _buildCallToAction(context),
        const SizedBox(height: 16),
        const Text(
          'Join 1,000+ people building healthier relationships',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.landingTextTertiary,
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _buildCallToAction(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: AppGradients.accent,
          borderRadius: BorderRadius.circular(AppBorderRadius.round),
          boxShadow: AppShadows.button,
        ),
        child: TextButton(
          onPressed: () {
            context.go('/onboarding');
          },
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppBorderRadius.round)),
            foregroundColor: Colors.white,
            textStyle:
                const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              // Adjust text based on available width
              final text = 'Sign up for early access';
              final maxWidth = constraints.maxWidth;
              
              // If we have enough space, show full text with icon
              if (maxWidth > 220) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        text,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(Icons.arrow_forward_rounded, size: 22),
                  ],
                );
              } else {
                // On narrow screens, show text only
                return Text(
                  text,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                );
              }
            },
          ),
        ),
      ),
    );
  }
}

class _ChallengeSection extends StatelessWidget {
  const _ChallengeSection();

  static final _challenges = [
    _Challenge(
      icon: Icons.event_busy,
      iconColor: AppColors.challengePurple,
      iconBackground: AppColors.challengePurple.withValues(alpha: 0.1),
      title: 'Scheduling conflicts',
      description: 'between multiple partners',
    ),
    _Challenge(
      icon: Icons.lock_outline,
      iconColor: AppColors.challengeBlue,
      iconBackground: AppColors.challengeBlue.withValues(alpha: 0.1),
      title: 'Privacy concerns',
      description: 'when sharing calendars',
    ),
    _Challenge(
      icon: Icons.chat_bubble_outline,
      iconColor: AppColors.challengeGreen,
      iconBackground: AppColors.challengeGreen.withValues(alpha: 0.1),
      title: 'Communication gaps',
      description: 'about availability and plans',
    ),
    _Challenge(
      icon: Icons.balance_outlined,
      iconColor: AppColors.challengeIndigo,
      iconBackground: AppColors.challengeIndigo.withValues(alpha: 0.1),
      title: 'Consent confusion',
      description: 'around information sharing',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
      decoration: BoxDecoration(
        color: AppColors.backgroundWhite,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowColor,
            blurRadius: 32,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'The Challenge',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.landingTextPrimary,
            ),
          ),
          const SizedBox(height: 24),
          ..._challenges.map((challenge) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: challenge.iconBackground,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      challenge.icon,
                      color: challenge.iconColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          challenge.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.landingTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          challenge.description,
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.landingTextSecondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _Challenge {
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final String title;
  final String description;

  const _Challenge({
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.title,
    required this.description,
  });
}

class _GradientText extends StatelessWidget {
  const _GradientText(
    this.text, {
    required this.gradient,
    required this.style,
  });

  final String text;
  final LinearGradient gradient;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      blendMode: BlendMode.srcIn,
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: style.copyWith(color: Colors.white),
      ),
    );
  }
}
