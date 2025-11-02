part of 'pages.dart';

class HomeView extends StatelessWidget {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScaffold(
      body: SafeArea(
        child: Column(
          children: [
            const HomeAppBar(),
            Expanded(
              child: BlocBuilder<HomeCubit, HomeState>(
                builder: (context, state) {
                  if (state is HomeLoading) {
                    return const HomeLoadingState();
                  } else if (state is HomeRefreshing) {
                    // Show shimmer with previous data during refresh
                    return HomeRefreshingState(
                      previousData: state.previousData,
                    );
                  } else if (state is HomeError) {
                    return ErrorDisplayWidget(
                      message: state.message,
                      onRetry: () => context.read<HomeCubit>().refresh(),
                    );
                  } else if (state is HomeLoaded) {
                    return HomeLoadedContent(data: state.data);
                  }
                  return const SizedBox();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
