part of 'pages.dart';

class CalendarSyncPage extends StatelessWidget {
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const CalendarSyncPage({
    super.key,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final isConnected =
            state is OnboardingInProgress &&
            state.calendarSync?.isConnected == true;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),

              // Icon
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.backgroundWhite.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.calendar_month_rounded,
                  size: 64,
                  color: AppColors.primary,
                ),
              ),

              const SizedBox(height: 32),

              // Title
              const CustomText(
                'Sync Your Calendar',
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.backgroundWhite,
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Description
              const CustomText(
                'Connect your existing calendar to automatically sync your events to MyOrbit. Your calendar syncs one-way only.',
                fontSize: 16,
                color: AppColors.textSecondary,
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 48),

              // Calendar Options
              if (!isConnected) ...[
                CalendarOption(
                  icon: 'assets/icons/google_calendar.png',
                  title: 'Google Calendar',
                  description: 'Sync events from your Google account',
                  onTap: () {
                    context.read<OnboardingCubit>().connectCalendar(
                      CalendarProvider.google,
                    );
                  },
                ),
                const SizedBox(height: 16),
                CalendarOption(
                  icon: 'assets/icons/apple_calendar.png',
                  title: 'Apple Calendar',
                  description: 'Sync events from your Apple account',
                  onTap: () {
                    context.read<OnboardingCubit>().connectCalendar(
                      CalendarProvider.apple,
                    );
                  },
                ),
              ] else ...[
                // Success State
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.green.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_rounded,
                        color: Colors.green,
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const CustomText(
                              'Calendar Connected!',
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.backgroundWhite,
                            ),
                            const SizedBox(height: 4),
                            CustomText(
                              (state).calendarSync?.accountEmail ?? '',
                              fontSize: 14,
                              color: AppColors.backgroundWhite,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const Spacer(),

              // Buttons
              if (isConnected)
                CustomButton(
                  label: 'Continue',
                  onPressed: onNext,

                  textColor: Colors.white,
                  borderRadius: 12,
                )
              else
                TextButton(
                  onPressed: onSkip,
                  child: const CustomText(
                    'Skip for now',
                    fontSize: 16,
                    color: AppColors.primary,
                  ),
                ),

              const SizedBox(height: 32),
            ],
          ),
        );
      },
    );
  }
}
