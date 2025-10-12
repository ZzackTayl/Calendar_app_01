/* AUTOMATICALLY GENERATED CODE DO NOT MODIFY */
/*   To generate run: "serverpod generate"    */

// ignore_for_file: implementation_imports
// ignore_for_file: library_private_types_in_public_api
// ignore_for_file: non_constant_identifier_names
// ignore_for_file: public_member_api_docs
// ignore_for_file: type_literal_in_constant_pattern
// ignore_for_file: use_super_parameters

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:serverpod_client/serverpod_client.dart' as _i1;
import 'dart:async' as _i2;
import 'package:calendar_client/src/protocol/calendar.dart' as _i3;
import 'package:calendar_client/src/protocol/user.dart' as _i4;
import 'protocol.dart' as _i5;

/// {@category Endpoint}
class EndpointCalendar extends _i1.EndpointRef {
  EndpointCalendar(_i1.EndpointCaller caller) : super(caller);

  @override
  String get name => 'calendar';

  /// Get all calendar events
  _i2.Future<List<_i3.Calendar>> getAll() =>
      caller.callServerEndpoint<List<_i3.Calendar>>(
        'calendar',
        'getAll',
        {},
      );

  /// Get calendar events for a specific date
  _i2.Future<List<_i3.Calendar>> getByDate(DateTime date) =>
      caller.callServerEndpoint<List<_i3.Calendar>>(
        'calendar',
        'getByDate',
        {'date': date},
      );

  /// Get calendar events within a date range
  _i2.Future<List<_i3.Calendar>> getByDateRange(
    DateTime startDate,
    DateTime endDate,
  ) =>
      caller.callServerEndpoint<List<_i3.Calendar>>(
        'calendar',
        'getByDateRange',
        {
          'startDate': startDate,
          'endDate': endDate,
        },
      );

  /// Get a specific calendar event by ID
  _i2.Future<_i3.Calendar?> getById(int id) =>
      caller.callServerEndpoint<_i3.Calendar?>(
        'calendar',
        'getById',
        {'id': id},
      );

  /// Create a new calendar event
  _i2.Future<_i3.Calendar> create(_i3.Calendar calendar) =>
      caller.callServerEndpoint<_i3.Calendar>(
        'calendar',
        'create',
        {'calendar': calendar},
      );

  /// Update an existing calendar event
  _i2.Future<_i3.Calendar> update(_i3.Calendar calendar) =>
      caller.callServerEndpoint<_i3.Calendar>(
        'calendar',
        'update',
        {'calendar': calendar},
      );

  /// Delete a calendar event
  _i2.Future<bool> delete(int id) => caller.callServerEndpoint<bool>(
        'calendar',
        'delete',
        {'id': id},
      );

  /// Delete multiple calendar events
  _i2.Future<int> deleteMultiple(List<int> ids) =>
      caller.callServerEndpoint<int>(
        'calendar',
        'deleteMultiple',
        {'ids': ids},
      );

  /// Search calendar events by title
  _i2.Future<List<_i3.Calendar>> searchByTitle(String searchTerm) =>
      caller.callServerEndpoint<List<_i3.Calendar>>(
        'calendar',
        'searchByTitle',
        {'searchTerm': searchTerm},
      );

  /// Get count of calendar events
  _i2.Future<int> count() => caller.callServerEndpoint<int>(
        'calendar',
        'count',
        {},
      );
}

/// {@category Endpoint}
class EndpointHealth extends _i1.EndpointRef {
  EndpointHealth(_i1.EndpointCaller caller) : super(caller);

  @override
  String get name => 'health';

  /// Basic health check
  _i2.Future<bool> check() => caller.callServerEndpoint<bool>(
        'health',
        'check',
        {},
      );

  /// Detailed health status
  _i2.Future<Map<String, dynamic>> status() =>
      caller.callServerEndpoint<Map<String, dynamic>>(
        'health',
        'status',
        {},
      );
}

/// {@category Endpoint}
class EndpointUser extends _i1.EndpointRef {
  EndpointUser(_i1.EndpointCaller caller) : super(caller);

  @override
  String get name => 'user';

  /// Get all users
  _i2.Future<List<_i4.User>> getAll() =>
      caller.callServerEndpoint<List<_i4.User>>(
        'user',
        'getAll',
        {},
      );

  /// Get a specific user by ID
  _i2.Future<_i4.User?> getById(int id) => caller.callServerEndpoint<_i4.User?>(
        'user',
        'getById',
        {'id': id},
      );

  /// Get a user by email address
  _i2.Future<_i4.User?> getByEmail(String email) =>
      caller.callServerEndpoint<_i4.User?>(
        'user',
        'getByEmail',
        {'email': email},
      );

  /// Create a new user
  _i2.Future<_i4.User> create(_i4.User user) =>
      caller.callServerEndpoint<_i4.User>(
        'user',
        'create',
        {'user': user},
      );

  /// Update an existing user
  _i2.Future<_i4.User> update(_i4.User user) =>
      caller.callServerEndpoint<_i4.User>(
        'user',
        'update',
        {'user': user},
      );

  /// Delete a user
  _i2.Future<bool> delete(int id) => caller.callServerEndpoint<bool>(
        'user',
        'delete',
        {'id': id},
      );

  /// Search users by name
  _i2.Future<List<_i4.User>> searchByName(String searchTerm) =>
      caller.callServerEndpoint<List<_i4.User>>(
        'user',
        'searchByName',
        {'searchTerm': searchTerm},
      );

  /// Get users created within a date range
  _i2.Future<List<_i4.User>> getByDateRange(
    DateTime startDate,
    DateTime endDate,
  ) =>
      caller.callServerEndpoint<List<_i4.User>>(
        'user',
        'getByDateRange',
        {
          'startDate': startDate,
          'endDate': endDate,
        },
      );

  /// Get count of users
  _i2.Future<int> count() => caller.callServerEndpoint<int>(
        'user',
        'count',
        {},
      );

  /// Check if email exists
  _i2.Future<bool> emailExists(String email) => caller.callServerEndpoint<bool>(
        'user',
        'emailExists',
        {'email': email},
      );
}

class Client extends _i1.ServerpodClientShared {
  Client(
    String host, {
    dynamic securityContext,
    _i1.AuthenticationKeyManager? authenticationKeyManager,
    Duration? streamingConnectionTimeout,
    Duration? connectionTimeout,
    Function(
      _i1.MethodCallContext,
      Object,
      StackTrace,
    )? onFailedCall,
    Function(_i1.MethodCallContext)? onSucceededCall,
    bool? disconnectStreamsOnLostInternetConnection,
  }) : super(
          host,
          _i5.Protocol(),
          securityContext: securityContext,
          authenticationKeyManager: authenticationKeyManager,
          streamingConnectionTimeout: streamingConnectionTimeout,
          connectionTimeout: connectionTimeout,
          onFailedCall: onFailedCall,
          onSucceededCall: onSucceededCall,
          disconnectStreamsOnLostInternetConnection:
              disconnectStreamsOnLostInternetConnection,
        ) {
    calendar = EndpointCalendar(this);
    health = EndpointHealth(this);
    user = EndpointUser(this);
  }

  late final EndpointCalendar calendar;

  late final EndpointHealth health;

  late final EndpointUser user;

  @override
  Map<String, _i1.EndpointRef> get endpointRefLookup => {
        'calendar': calendar,
        'health': health,
        'user': user,
      };

  @override
  Map<String, _i1.ModuleEndpointCaller> get moduleLookup => {};
}
