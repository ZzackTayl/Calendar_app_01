import 'package:equatable/equatable.dart';

/// Simple state for managing expandable sections
///
/// This is a perfect example of when to use Cubit instead of BLoC:
/// - Simple synchronous state (no async operations)
/// - Just boolean toggles (no complex business logic)
/// - UI-only concern (no navigation, no API calls)
///
/// Cubit is lightweight: only state.dart + cubit.dart (no event.dart needed!)
class ExpansionState extends Equatable {
  final bool isPrivacyExpanded;
  final bool isInviteesExpanded;

  const ExpansionState({
    this.isPrivacyExpanded = false,
    this.isInviteesExpanded = false,
  });

  ExpansionState copyWith({
    bool? isPrivacyExpanded,
    bool? isInviteesExpanded,
  }) {
    return ExpansionState(
      isPrivacyExpanded: isPrivacyExpanded ?? this.isPrivacyExpanded,
      isInviteesExpanded: isInviteesExpanded ?? this.isInviteesExpanded,
    );
  }

  @override
  List<Object?> get props => [isPrivacyExpanded, isInviteesExpanded];
}
