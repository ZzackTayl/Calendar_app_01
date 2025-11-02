part of 'widgets.dart';

/// Settings card with theme toggle
class HomeSettingsCard extends StatelessWidget {
  const HomeSettingsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return HomeCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const CustomText(
              'Settings',
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.backgroundWhite,
            ),
            IconButton(
              icon: BlocBuilder<ThemeCubit, ThemeStatus>(
                builder: (context, state) {
                  return Icon(
                    state == ThemeStatus.dark
                        ? Icons.light_mode
                        : Icons.dark_mode,
                    color: AppColors.primary,
                  );
                },
              ),
              onPressed: () {
                context.read<ThemeCubit>().toggleTheme();
              },
            ),
          ],
        ),
      ),
    );
  }
}
