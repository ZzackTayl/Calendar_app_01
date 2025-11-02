part of 'pages.dart';

class WelcomePage extends StatefulWidget {
  final VoidCallback onNext;

  const WelcomePage({super.key, required this.onNext});

  @override
  State<WelcomePage> createState() => _WelcomePageState();
}

class _WelcomePageState extends State<WelcomePage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),

          // Logo
          FadeTransition(
            opacity: _fadeAnimation,
            child: Image.asset(
              Assets.iconsLandingpageIconLogoNm,
              width: 200,
              height: 200,
            ),
          ),

          const SizedBox(height: 15),

          // Title
          SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: const CustomText(
                'Welcome to MyOrbit',
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: AppColors.backgroundWhite,
                textAlign: TextAlign.center,
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Description
          SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: const CustomText(
                'Organize your life, connect with others, and keep your calendar private and secure.',
                fontSize: 16,
                color: AppColors.textSecondary,
                textAlign: TextAlign.center,
              ),
            ),
          ),

          const SizedBox(height: 60),

          // Features
          SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: const [
                  FeatureItem(
                    icon: Icons.sync_rounded,
                    title: 'Sync Your Calendars',
                    description: 'Connect Google or Apple calendars seamlessly',
                  ),
                  SizedBox(height: 24),
                  FeatureItem(
                    icon: Icons.security_rounded,
                    title: 'Privacy First',
                    description: 'Control who sees what on your calendar',
                  ),
                  SizedBox(height: 24),
                  FeatureItem(
                    icon: Icons.people_rounded,
                    title: 'Stay Connected',
                    description: 'Share your schedule with trusted connections',
                  ),
                ],
              ),
            ),
          ),

          const Spacer(),

          // Get Started Button
          FadeTransition(
            opacity: _fadeAnimation,
            child: SizedBox(
              width: double.infinity,
              child: CustomButton(
                label: 'Get Started',
                onPressed: widget.onNext,
                height: 56, // Matches vertical padding 16 + text height ~56
                borderRadius: 12,
                textColor: Colors.white,
                isLoading: false, // Set true if you have a loading state
                // icon: Icons.arrow_forward, // Optional: add icon if needed
              ),
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
