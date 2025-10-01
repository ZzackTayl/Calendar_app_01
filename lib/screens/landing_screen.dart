import 'package:flutter/material.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  static const _backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFE6F3FF), Color(0xFFFDE6FF)],
  );

  static const _accentGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF7C3BFF), Color(0xFFF13F9C)],
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: _backgroundGradient),
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
          'assets/images/myorbit_logo.png',
          width: 280,
          height: 120,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 16),
        const Text(
          'The calendar app designed for ethical non-monogamy',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1F1F39),
            height: 1.3,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Manage multiple relationships with consent, clarity, and care',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            color: Color(0xFF5B5A78),
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
            color: Color(0xFF6C6A88),
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
          gradient: _accentGradient,
          borderRadius: BorderRadius.circular(40),
          boxShadow: const [
            BoxShadow(
              color: Color(0x337C3BFF),
              blurRadius: 30,
              offset: Offset(0, 16),
            ),
          ],
        ),
        child: TextButton(
          onPressed: () {
            Navigator.pushReplacementNamed(context, '/onboarding');
          },
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(40)),
            foregroundColor: Colors.white,
            textStyle:
                const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Flexible(
                child: Text(
                  'Sign up for early access',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 10),
              const Icon(Icons.arrow_forward_rounded, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChallengeSection extends StatelessWidget {
  const _ChallengeSection();

  static const _challenges = [
    _Challenge(
      icon: Icons.event_busy,
      iconColor: Color(0xFF7C3BFF),
      iconBackground: Color(0x167C3BFF),
      title: 'Scheduling conflicts',
      description: 'between multiple partners',
    ),
    _Challenge(
      icon: Icons.lock_outline,
      iconColor: Color(0xFF2D87FF),
      iconBackground: Color(0x162D87FF),
      title: 'Privacy concerns',
      description: 'when sharing calendars',
    ),
    _Challenge(
      icon: Icons.chat_bubble_outline,
      iconColor: Color(0xFF26BFA6),
      iconBackground: Color(0x1626BFA6),
      title: 'Communication gaps',
      description: 'about availability and plans',
    ),
    _Challenge(
      icon: Icons.balance_outlined,
      iconColor: Color(0xFF5F63FF),
      iconBackground: Color(0x165F63FF),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 32,
            offset: Offset(0, 20),
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
              color: Color(0xFF1F1F39),
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
                            color: Color(0xFF1F1F39),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          challenge.description,
                          style: const TextStyle(
                            fontSize: 15,
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
