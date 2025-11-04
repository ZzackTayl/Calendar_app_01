// Contact Cubit following MyOrbit_CleanArch pattern

import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../domain/entities/contact.dart';
import '../../domain/entities/contact_invitation.dart';
import '../../domain/usecases/accept_invitation.dart';
import '../../domain/usecases/create_contact.dart';
import '../../domain/usecases/delete_contact.dart';
import '../../domain/usecases/get_contacts.dart';
import '../../domain/usecases/get_pending_invitations.dart';
import '../../domain/usecases/reject_invitation.dart';
import '../../domain/usecases/send_invitation.dart';
import '../../domain/usecases/update_contact.dart';

/// Contact state
class ContactState {
  final AppStateStatus status;
  final List<Contact> contacts;
  final List<ContactInvitation> pendingInvitations;
  final String message;
  final String searchQuery;

  const ContactState({
    this.status = AppStateStatus.initial,
    this.contacts = const [],
    this.pendingInvitations = const [],
    this.message = '',
    this.searchQuery = '',
  });

  /// Get filtered contacts based on search query
  List<Contact> get filteredContacts {
    if (searchQuery.isEmpty) return contacts;

    final query = searchQuery.toLowerCase();
    return contacts.where((contact) {
      final nameMatch = contact.name.toLowerCase().contains(query);
      final emailMatch =
          contact.email?.toLowerCase().contains(query) ?? false;
      final phoneMatch =
          contact.phoneNumber?.toLowerCase().contains(query) ?? false;
      return nameMatch || emailMatch || phoneMatch;
    }).toList();
  }

  ContactState copyWith({
    AppStateStatus? status,
    List<Contact>? contacts,
    List<ContactInvitation>? pendingInvitations,
    String? message,
    String? searchQuery,
  }) {
    return ContactState(
      status: status ?? this.status,
      contacts: contacts ?? this.contacts,
      pendingInvitations: pendingInvitations ?? this.pendingInvitations,
      message: message ?? this.message,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

/// Contact Cubit for managing contact state
class ContactCubit extends Cubit<ContactState> {
  ContactCubit({
    required GetContacts getContacts,
    required GetPendingInvitations getPendingInvitations,
    required CreateContact createContact,
    required UpdateContact updateContact,
    required DeleteContact deleteContact,
    required SendInvitation sendInvitation,
    required AcceptInvitation acceptInvitation,
    required RejectInvitation rejectInvitation,
  })  : _getContacts = getContacts,
        _getPendingInvitations = getPendingInvitations,
        _createContact = createContact,
        _updateContact = updateContact,
        _deleteContact = deleteContact,
        _sendInvitation = sendInvitation,
        _acceptInvitation = acceptInvitation,
        _rejectInvitation = rejectInvitation,
        super(const ContactState());

  final GetContacts _getContacts;
  final GetPendingInvitations _getPendingInvitations;
  final CreateContact _createContact;
  final UpdateContact _updateContact;
  final DeleteContact _deleteContact;
  final SendInvitation _sendInvitation;
  final AcceptInvitation _acceptInvitation;
  final RejectInvitation _rejectInvitation;

  /// Load all contacts
  Future<void> loadContacts() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _getContacts();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load contacts: ${failure.message}',
          name: 'ContactCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (contacts) {
        // Sort contacts alphabetically
        contacts.sort((a, b) => a.name.compareTo(b.name));
        emit(state.copyWith(
          status: AppStateStatus.success,
          contacts: contacts,
        ));
        // Also load pending invitations
        _loadPendingInvitations();
      },
    );
  }

  /// Load pending invitations
  Future<void> _loadPendingInvitations() async {
    final result = await _getPendingInvitations();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load invitations: ${failure.message}',
          name: 'ContactCubit',
        );
      },
      (invitations) {
        emit(state.copyWith(pendingInvitations: invitations));
      },
    );
  }

  /// Create a new contact
  Future<void> createContact(Contact contact) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _createContact(contact);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (created) {
        final updated = [...state.contacts, created];
        updated.sort((a, b) => a.name.compareTo(b.name));
        emit(state.copyWith(
          status: AppStateStatus.success,
          contacts: updated,
          message: 'Contact created successfully',
        ));
      },
    );
  }

  /// Update an existing contact
  Future<void> updateContact(Contact contact) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _updateContact(contact);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (updated) {
        final contacts = state.contacts.map((c) {
          return c.id == updated.id ? updated : c;
        }).toList();
        contacts.sort((a, b) => a.name.compareTo(b.name));
        emit(state.copyWith(
          status: AppStateStatus.success,
          contacts: contacts,
          message: 'Contact updated successfully',
        ));
      },
    );
  }

  /// Delete a contact
  Future<void> deleteContact(String contactId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _deleteContact(contactId);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        final contacts =
            state.contacts.where((c) => c.id != contactId).toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          contacts: contacts,
          message: 'Contact deleted successfully',
        ));
      },
    );
  }

  /// Send invitation to contact
  Future<void> sendInvitation({
    required String contactId,
    required String method,
  }) async {
    final result = await _sendInvitation(
      contactId: contactId,
      method: method,
    );

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        emit(state.copyWith(
          status: AppStateStatus.success,
          message: 'Invitation sent successfully',
        ));
      },
    );
  }

  /// Accept invitation
  Future<void> acceptInvitation(String invitationId) async {
    final result = await _acceptInvitation(invitationId);

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        // Remove from pending invitations
        final invitations = state.pendingInvitations
            .where((inv) => inv.id != invitationId)
            .toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          pendingInvitations: invitations,
          message: 'Invitation accepted',
        ));
        // Reload contacts to get the new contact
        loadContacts();
      },
    );
  }

  /// Reject invitation
  Future<void> rejectInvitation(String invitationId) async {
    final result = await _rejectInvitation(invitationId);

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        // Remove from pending invitations
        final invitations = state.pendingInvitations
            .where((inv) => inv.id != invitationId)
            .toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          pendingInvitations: invitations,
          message: 'Invitation rejected',
        ));
      },
    );
  }

  /// Set search query
  void setSearchQuery(String query) {
    emit(state.copyWith(searchQuery: query));
  }

  /// Clear search query
  void clearSearch() {
    emit(state.copyWith(searchQuery: ''));
  }

  /// Refresh contacts
  Future<void> refresh() => loadContacts();
}

