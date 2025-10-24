import 'dart:developer' as developer;
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../domain/data_export_request.dart';

/// API service for managing user data export requests.
class DataExportApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Create a new data export request for the authenticated user.
  static Future<Result<DataExportRequest>> requestExport({
    required bool includeEvents,
    required bool includeContacts,
    required bool includeSignals,
    String format = 'json',
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('data_export_requests')
          .insert({
            'user_id': userId,
            'include_events': includeEvents,
            'include_contacts': includeContacts,
            'include_signals': includeSignals,
            'format': format,
          })
          .select()
          .single();

      return Success(DataExportRequest.fromJson(response));
    } on SocketException catch (e) {
      developer.log(
        'Network error requesting data export: $e',
        name: 'DataExportApi',
      );
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log(
        'Database error requesting data export: $e',
        name: 'DataExportApi',
      );
      return Failure('Failed to request data export.', e);
    } catch (e) {
      developer.log(
        'Unexpected error requesting data export: $e',
        name: 'DataExportApi',
      );
      return Failure('Failed to request data export.', e as Exception?);
    }
  }
}
