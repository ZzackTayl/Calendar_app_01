part of 'pages.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    // Start onboarding when page loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OnboardingCubit>().startOnboarding();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OnboardingCubit, OnboardingState>(
      listener: (context, state) {
        if (state is OnboardingCompleted) {
          // Navigate to main app
          context.goNamed(AppRoutes.login);
        } else if (state is OnboardingError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: Colors.red),
          );
        } else if (state is OnboardingInProgress) {
          // Animate to the current page when state changes
          if (_pageController.hasClients) {
            _pageController.animateToPage(
              state.currentPageIndex,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
            );
          }
        }
      },
      builder: (context, state) {
        // Show loading only for initial state
        if (state is OnboardingInitial) {
          return const LoadingView();
        }

        if (state is! OnboardingInProgress) {
          return const LoadingView();
        }

        return CustomScaffold(
          body: SafeArea(
            child: Column(
              children: [
                // Progress indicator
                SizedBox(
                  height: 4,
                  child: LinearProgressIndicator(
                    value: (state.currentPageIndex + 1) / 4,
                    backgroundColor: AppColors.textSecondary.withValues(
                      alpha: 0.2,
                    ),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.primary,
                    ),
                  ),
                ),
                // Page content
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      WelcomePage(
                        onNext: () {
                          context.read<OnboardingCubit>().nextPage();
                        },
                      ),
                      CalendarSyncPage(
                        onNext: () {
                          context.read<OnboardingCubit>().nextPage();
                        },
                        onSkip: () {
                          context.read<OnboardingCubit>().skipCalendarSync();
                          context.read<OnboardingCubit>().nextPage();
                        },
                      ),
                      PermissionsIntroPage(
                        onNext: () {
                          context.read<OnboardingCubit>().nextPage();
                        },
                      ),
                      ContactsImportPage(
                        onComplete: () {
                          context.read<OnboardingCubit>().completeOnboarding();
                        },
                        onSkip: () {
                          context.read<OnboardingCubit>().skipContactsImport();
                          context.read<OnboardingCubit>().completeOnboarding();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
