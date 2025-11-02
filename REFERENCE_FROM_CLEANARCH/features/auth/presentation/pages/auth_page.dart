part of 'pages.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleSubmit(BuildContext context) {
    // if (!_formKey.currentState!.validate()) return;

    final cubit = context.read<AuthCubit>();
    final isSignUp = cubit.state.isSignUpMode;

    if (isSignUp) {
      cubit.signup(
        _nameController.text.trim(),
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );
    } else {
      cubit.login(
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthCubit(AuthRepoImpl()),
      child: CustomScaffold(
        body: BlocListener<AuthCubit, AuthState>(
          listener: (context, state) {
            if (state.status == AppStateStatus.success) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(state.message)));
              context.goNamed(AppRoutes.home);
            } else if (state.status == AppStateStatus.failure) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.secondary,
                ),
              );
            }
          },
          child: BlocBuilder<AuthCubit, AuthState>(
            builder: (context, state) {
              final isLoading = state.status == AppStateStatus.loading;
              final isSignUp = state.isSignUpMode;

              return SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.xxl),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(
                            AppBorderRadius.xLarge,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(AppSpacing.xxl),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              AuthHeader(isSignUp: isSignUp),
                              const SizedBox(height: 32),

                              AuthModeToggle(isSignUp: isSignUp),
                              const SizedBox(height: 32),

                              // ANIMATED FORM TRANSITION
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 300),
                                transitionBuilder:
                                    (
                                      Widget child,
                                      Animation<double> animation,
                                    ) {
                                      return FadeTransition(
                                        opacity: animation,
                                        child: SlideTransition(
                                          position: Tween<Offset>(
                                            begin: const Offset(0, 0.1),
                                            end: Offset.zero,
                                          ).animate(animation),
                                          child: child,
                                        ),
                                      );
                                    },
                                child: isSignUp
                                    ? SignUpForm(
                                        key: const ValueKey('signup'),
                                        nameController: _nameController,
                                        emailController: _emailController,
                                        passwordController: _passwordController,
                                        confirmPasswordController:
                                            _confirmPasswordController,
                                        isLoading: isLoading,
                                        onSubmit: () => _handleSubmit(context),
                                      )
                                    : SignInForm(
                                        key: const ValueKey('signin'),
                                        emailController: _emailController,
                                        passwordController: _passwordController,
                                        isLoading: isLoading,
                                        onSubmit: () => _handleSubmit(context),
                                      ),
                              ),

                              const SizedBox(height: 32),

                              CustomButton(
                                label: isSignUp ? 'Create account' : 'Sign in',
                                isLoading: isLoading,
                                onPressed: () => _handleSubmit(context),
                              ),

                              if (!isSignUp) ...[
                                const SizedBox(height: 16),
                                const ForgotPasswordButton(),
                              ],

                              const SizedBox(height: 20),
                              const AuthDivider(),
                              const SizedBox(height: 20),

                              GoogleSignInButton(isLoading: isLoading),

                              const SizedBox(height: 24),
                              AuthFooter(isSignUp: isSignUp),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
