import 'package:flutter_bloc/flutter_bloc.dart';
import 'expansion_state.dart';

/// Cubit for managing expansion state of collapsible sections
///
/// This demonstrates the correct use of Cubit for simple UI state:
/// ✅ No events file needed (Cubit uses direct method calls)
/// ✅ No async operations (synchronous state updates)
/// ✅ No business logic (just UI state management)
/// ✅ No navigation (just expand/collapse toggles)
///
/// Compare to EventBloc which:
/// ❌ Has events file (CreateEvent, UpdateEvent, etc.)
/// ❌ Has async operations (API calls)
/// ❌ Has business logic (event creation, validation)
/// ❌ Triggers navigation (EventOperationSuccess)
///
/// Rule of thumb:
/// - Use Cubit for: toggles, tab indices, UI visibility, theme switches
/// - Use BLoC for: data operations, async workflows, complex business logic
class ExpansionCubit extends Cubit<ExpansionState> {
  ExpansionCubit() : super(const ExpansionState());

  /// Toggle privacy section expansion
  void togglePrivacyExpansion() {
    emit(state.copyWith(
      isPrivacyExpanded: !state.isPrivacyExpanded,
    ));
  }

  /// Toggle invitees section expansion
  void toggleInviteesExpansion() {
    emit(state.copyWith(
      isInviteesExpanded: !state.isInviteesExpanded,
    ));
  }

  /// Set specific expansion state (useful for programmatic control)
  void setPrivacyExpanded(bool expanded) {
    emit(state.copyWith(isPrivacyExpanded: expanded));
  }

  /// Set invitees expansion state
  void setInviteesExpanded(bool expanded) {
    emit(state.copyWith(isInviteesExpanded: expanded));
  }

  /// Collapse all sections (useful for reset)
  void collapseAll() {
    emit(const ExpansionState(
      isPrivacyExpanded: false,
      isInviteesExpanded: false,
    ));
  }
}
