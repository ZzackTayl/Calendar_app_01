/* AUTOMATICALLY GENERATED CODE DO NOT MODIFY */
/*   To generate run: "serverpod generate"    */

// ignore_for_file: implementation_imports
// ignore_for_file: library_private_types_in_public_api
// ignore_for_file: non_constant_identifier_names
// ignore_for_file: public_member_api_docs
// ignore_for_file: type_literal_in_constant_pattern
// ignore_for_file: use_super_parameters

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:serverpod/serverpod.dart' as _i1;
import '../endpoints/calendar_endpoint.dart' as _i2;
import '../endpoints/health_endpoint.dart' as _i3;
import '../endpoints/user_endpoint.dart' as _i4;
import 'package:calendar_server/src/generated/calendar.dart' as _i5;
import 'package:calendar_server/src/generated/user.dart' as _i6;

class Endpoints extends _i1.EndpointDispatch {
  @override
  void initializeEndpoints(_i1.Server server) {
    var endpoints = <String, _i1.Endpoint>{
      'calendar': _i2.CalendarEndpoint()
        ..initialize(
          server,
          'calendar',
          null,
        ),
      'health': _i3.HealthEndpoint()
        ..initialize(
          server,
          'health',
          null,
        ),
      'user': _i4.UserEndpoint()
        ..initialize(
          server,
          'user',
          null,
        ),
    };
    connectors['calendar'] = _i1.EndpointConnector(
      name: 'calendar',
      endpoint: endpoints['calendar']!,
      methodConnectors: {
        'getAll': _i1.MethodConnector(
          name: 'getAll',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).getAll(session),
        ),
        'getByDate': _i1.MethodConnector(
          name: 'getByDate',
          params: {
            'date': _i1.ParameterDescription(
              name: 'date',
              type: _i1.getType<DateTime>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).getByDate(
            session,
            params['date'],
          ),
        ),
        'getByDateRange': _i1.MethodConnector(
          name: 'getByDateRange',
          params: {
            'startDate': _i1.ParameterDescription(
              name: 'startDate',
              type: _i1.getType<DateTime>(),
              nullable: false,
            ),
            'endDate': _i1.ParameterDescription(
              name: 'endDate',
              type: _i1.getType<DateTime>(),
              nullable: false,
            ),
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).getByDateRange(
            session,
            params['startDate'],
            params['endDate'],
          ),
        ),
        'getById': _i1.MethodConnector(
          name: 'getById',
          params: {
            'id': _i1.ParameterDescription(
              name: 'id',
              type: _i1.getType<int>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).getById(
            session,
            params['id'],
          ),
        ),
        'create': _i1.MethodConnector(
          name: 'create',
          params: {
            'calendar': _i1.ParameterDescription(
              name: 'calendar',
              type: _i1.getType<_i5.Calendar>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).create(
            session,
            params['calendar'],
          ),
        ),
        'update': _i1.MethodConnector(
          name: 'update',
          params: {
            'calendar': _i1.ParameterDescription(
              name: 'calendar',
              type: _i1.getType<_i5.Calendar>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).update(
            session,
            params['calendar'],
          ),
        ),
        'delete': _i1.MethodConnector(
          name: 'delete',
          params: {
            'id': _i1.ParameterDescription(
              name: 'id',
              type: _i1.getType<int>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).delete(
            session,
            params['id'],
          ),
        ),
        'deleteMultiple': _i1.MethodConnector(
          name: 'deleteMultiple',
          params: {
            'ids': _i1.ParameterDescription(
              name: 'ids',
              type: _i1.getType<List<int>>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).deleteMultiple(
            session,
            params['ids'],
          ),
        ),
        'searchByTitle': _i1.MethodConnector(
          name: 'searchByTitle',
          params: {
            'searchTerm': _i1.ParameterDescription(
              name: 'searchTerm',
              type: _i1.getType<String>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).searchByTitle(
            session,
            params['searchTerm'],
          ),
        ),
        'count': _i1.MethodConnector(
          name: 'count',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['calendar'] as _i2.CalendarEndpoint).count(session),
        ),
      },
    );
    connectors['health'] = _i1.EndpointConnector(
      name: 'health',
      endpoint: endpoints['health']!,
      methodConnectors: {
        'check': _i1.MethodConnector(
          name: 'check',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['health'] as _i3.HealthEndpoint).check(session),
        ),
        'status': _i1.MethodConnector(
          name: 'status',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['health'] as _i3.HealthEndpoint).status(session),
        ),
      },
    );
    connectors['user'] = _i1.EndpointConnector(
      name: 'user',
      endpoint: endpoints['user']!,
      methodConnectors: {
        'getAll': _i1.MethodConnector(
          name: 'getAll',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).getAll(session),
        ),
        'getById': _i1.MethodConnector(
          name: 'getById',
          params: {
            'id': _i1.ParameterDescription(
              name: 'id',
              type: _i1.getType<int>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).getById(
            session,
            params['id'],
          ),
        ),
        'getByEmail': _i1.MethodConnector(
          name: 'getByEmail',
          params: {
            'email': _i1.ParameterDescription(
              name: 'email',
              type: _i1.getType<String>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).getByEmail(
            session,
            params['email'],
          ),
        ),
        'create': _i1.MethodConnector(
          name: 'create',
          params: {
            'user': _i1.ParameterDescription(
              name: 'user',
              type: _i1.getType<_i6.User>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).create(
            session,
            params['user'],
          ),
        ),
        'update': _i1.MethodConnector(
          name: 'update',
          params: {
            'user': _i1.ParameterDescription(
              name: 'user',
              type: _i1.getType<_i6.User>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).update(
            session,
            params['user'],
          ),
        ),
        'delete': _i1.MethodConnector(
          name: 'delete',
          params: {
            'id': _i1.ParameterDescription(
              name: 'id',
              type: _i1.getType<int>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).delete(
            session,
            params['id'],
          ),
        ),
        'searchByName': _i1.MethodConnector(
          name: 'searchByName',
          params: {
            'searchTerm': _i1.ParameterDescription(
              name: 'searchTerm',
              type: _i1.getType<String>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).searchByName(
            session,
            params['searchTerm'],
          ),
        ),
        'getByDateRange': _i1.MethodConnector(
          name: 'getByDateRange',
          params: {
            'startDate': _i1.ParameterDescription(
              name: 'startDate',
              type: _i1.getType<DateTime>(),
              nullable: false,
            ),
            'endDate': _i1.ParameterDescription(
              name: 'endDate',
              type: _i1.getType<DateTime>(),
              nullable: false,
            ),
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).getByDateRange(
            session,
            params['startDate'],
            params['endDate'],
          ),
        ),
        'count': _i1.MethodConnector(
          name: 'count',
          params: {},
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).count(session),
        ),
        'emailExists': _i1.MethodConnector(
          name: 'emailExists',
          params: {
            'email': _i1.ParameterDescription(
              name: 'email',
              type: _i1.getType<String>(),
              nullable: false,
            )
          },
          call: (
            _i1.Session session,
            Map<String, dynamic> params,
          ) async =>
              (endpoints['user'] as _i4.UserEndpoint).emailExists(
            session,
            params['email'],
          ),
        ),
      },
    );
  }
}
