import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isConnecting = false;
  bool _googleConnected = false;

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

    try {
      // For demo purposes, just simulate connection
      await Future.delayed(const Duration(milliseconds: 1500));

      // In a real implementation, you would:
      // await AuthApi.signInWithGoogle();

      if (!mounted) return;
      setState(() {
        _isConnecting = false;
        _googleConnected = true;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Google Calendar connected! Setting up your profile...'),
        ),
      );

      // Auto-advance after brief delay
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      _handleNext();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isConnecting = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to connect: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  bool get _isLastStep => _currentStep == 3; // 4 total steps (0-3)

  bool get _canProceed {
    switch (_currentStep) {
      case 0:
        return _googleConnected;
      case 1:
      case 2:
      case 3:
        return true;
      default:
        return false;
    }
  }

  void _handleNext() {
    if (!_canProceed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please connect your Google Calendar to continue.'),
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
  }

  void _handleBack() {
    if (_currentStep == 0) {
      Navigator.pushReplacementNamed(context, '/');
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

    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    if (_currentStep > 0)
                      IconButton(
                        onPressed: _handleBack,
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        color: const Color(0xFF1F2C3E),
                      ),
                    if (_currentStep == 0)
                      TextButton(
                        onPressed: _handleBack,
                        child: const Text(
                          'Back',
                          style: TextStyle(
                            color: Color(0xFF1F2C3E),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    const Spacer(),
                    TextButton(
                      onPressed: _completeOnboarding,
                      child: const Text(
                        'Skip',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Progress indicator
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: LinearProgressIndicator(
                  value: (_currentStep + 1) / 4,
                  backgroundColor: Colors.white.withOpacity(0.3),
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(Color(0xFF26C281)),
                ),
              ),
              const SizedBox(height: 20),
              // Content
              Expanded(
                child: PageView(
                  controller: _pageController,
                  onPageChanged: (index) {
                    setState(() {
                      _currentStep = index;
                    });
                  },
                  children: [
                    _buildWelcomeStep(),
                    _buildSyncingStep(),
                    _buildSetupStep(),
                    _buildCompleteStep(),
                  ],
                ),
              ),
              // Navigation
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _canProceed ? _handleNext : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF26C281),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      _isLastStep ? 'Get Started' : 'Continue',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeStep() {
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
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: const Icon(
              Icons.calendar_today,
              size: 60,
              color: Color(0xFF26C281),
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'Welcome to MyOrbit',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2C3E),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'Your consent-aware calendar for complex social networks',
            style: TextStyle(
              fontSize: 18,
              color: Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isConnecting ? null : _connectGoogleCalendar,
              icon: _isConnecting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.login),
              label: Text(
                  _isConnecting ? 'Connecting...' : 'Connect Google Calendar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _googleConnected
                    ? const Color(0xFF26C281)
                    : const Color(0xFF4285F4),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (_googleConnected) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
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
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF26C281)),
          ),
          SizedBox(height: 40),
          Text(
            'Syncing Your Calendar',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2C3E),
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 16),
          Text(
            'We\'re securely importing your events and setting up your privacy preferences.',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF6B7280),
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
              color: const Color(0xFF7C3BFF).withOpacity(0.1),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.people,
              size: 50,
              color: Color(0xFF7C3BFF),
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'Your Space, Your Rules',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2C3E),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'MyOrbit gives you complete control over who sees what. Your privacy settings can be adjusted anytime.',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCompleteStep() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: const Color(0xFF26C281).withOpacity(0.1),
              borderRadius: BorderRadius.circular(50),
            ),
            child: const Icon(
              Icons.check_circle,
              size: 50,
              color: Color(0xFF26C281),
            ),
          ),
          const SizedBox(height: 40),
          const Text(
            'All Set!',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2C3E),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            'Welcome to your consent-aware calendar. You can now start managing your schedule with privacy and control.',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
