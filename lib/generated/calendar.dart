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

abstract class Calendar implements _i1.SerializableModel {
  Calendar._({
    this.id,
    required this.title,
    required this.date,
  });

  factory Calendar({
    int? id,
    required String title,
    required DateTime date,
  }) = _CalendarImpl;

  factory Calendar.fromJson(Map<String, dynamic> jsonSerialization) {
    return Calendar(
      id: jsonSerialization['id'] as int?,
      title: jsonSerialization['title'] as String,
      date: _i1.DateTimeJsonExtension.fromJson(jsonSerialization['date']),
    );
  }

  /// The database id, set if the object has been inserted into the
  /// database or if it has been fetched from the database. Otherwise,
  /// the id will be null.
  int? id;

  String title;

  DateTime date;

  /// Returns a shallow copy of this [Calendar]
  /// with some or all fields replaced by the given arguments.
  @_i1.useResult
  Calendar copyWith({
    int? id,
    String? title,
    DateTime? date,
  });
  @override
  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'title': title,
      'date': date.toJson(),
    };
  }

  @override
  String toString() {
    return _i1.SerializationManager.encode(this);
  }
}

class _Undefined {}

class _CalendarImpl extends Calendar {
  _CalendarImpl({
    int? id,
    required String title,
    required DateTime date,
  }) : super._(
          id: id,
          title: title,
          date: date,
        );

  /// Returns a shallow copy of this [Calendar]
  /// with some or all fields replaced by the given arguments.
  @_i1.useResult
  @override
  Calendar copyWith({
    Object? id = _Undefined,
    String? title,
    DateTime? date,
  }) {
    return Calendar(
      id: id is int? ? id : this.id,
      title: title ?? this.title,
      date: date ?? this.date,
    );
  }
}
