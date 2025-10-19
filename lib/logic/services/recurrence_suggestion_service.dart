import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/simple_recurrence.dart';

class RecurrenceSuggestionService {
  static const _storageKey = 'recurrence_suggestions_v1';

  static Future<void> recordEventOccurrence(
    String signature,
    DateTime occurrence,
  ) async {
    final store = await _loadStore();
    store.events[signature] =
        store.events[signature]?.addOccurrence(occurrence) ??
            _SuggestionEntry.initial(occurrence);
    await _saveStore(store);
  }

  static Future<SimpleRecurrence?> suggestionForEvent(
    String signature,
  ) async {
    final store = await _loadStore();
    final entry = store.events[signature];
    if (entry == null) return null;
    return entry.suggestedRecurrence;
  }

  static Future<void> dismissEventSuggestion(
    String signature,
    SimpleRecurrence recurrence,
  ) async {
    final store = await _loadStore();
    final entry = store.events[signature];
    if (entry == null) return;
    store.events[signature] = entry.dismiss(recurrence);
    await _saveStore(store);
  }

  static Future<void> markEventSuggestionApplied(
    String signature,
    SimpleRecurrence recurrence,
  ) =>
      dismissEventSuggestion(signature, recurrence);

  static Future<void> recordSignalOccurrence(
    String signature,
    DateTime occurrence,
  ) async {
    final store = await _loadStore();
    store.signals[signature] =
        store.signals[signature]?.addOccurrence(occurrence) ??
            _SuggestionEntry.initial(occurrence);
    await _saveStore(store);
  }

  static Future<SimpleRecurrence?> suggestionForSignal(
    String signature,
  ) async {
    final store = await _loadStore();
    final entry = store.signals[signature];
    if (entry == null) return null;
    return entry.suggestedRecurrence;
  }

  static Future<void> dismissSignalSuggestion(
    String signature,
    SimpleRecurrence recurrence,
  ) async {
    final store = await _loadStore();
    final entry = store.signals[signature];
    if (entry == null) return;
    store.signals[signature] = entry.dismiss(recurrence);
    await _saveStore(store);
  }

  static Future<void> markSignalSuggestionApplied(
    String signature,
    SimpleRecurrence recurrence,
  ) =>
      dismissSignalSuggestion(signature, recurrence);

  static Future<_SuggestionStore> _loadStore() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null) {
      return _SuggestionStore.empty();
    }
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return _SuggestionStore.fromJson(decoded);
    } catch (_) {
      return _SuggestionStore.empty();
    }
  }

  static Future<void> _saveStore(_SuggestionStore store) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(store.toJson()));
  }
}

class _SuggestionStore {
  _SuggestionStore({
    required this.events,
    required this.signals,
  });

  final Map<String, _SuggestionEntry> events;
  final Map<String, _SuggestionEntry> signals;

  factory _SuggestionStore.empty() => _SuggestionStore(
        events: <String, _SuggestionEntry>{},
        signals: <String, _SuggestionEntry>{},
      );

  factory _SuggestionStore.fromJson(Map<String, dynamic> json) {
    Map<String, _SuggestionEntry> parseSection(String key) {
      final section = json[key];
      if (section is! Map) return <String, _SuggestionEntry>{};
      return section.map(
        (dynamic k, dynamic v) => MapEntry(
          k as String,
          _SuggestionEntry.fromJson(v as Map<String, dynamic>),
        ),
      );
    }

    return _SuggestionStore(
      events: parseSection('events'),
      signals: parseSection('signals'),
    );
  }

  Map<String, dynamic> toJson() {
    Map<String, dynamic> encodeSection(Map<String, _SuggestionEntry> section) {
      return section.map(
        (key, value) => MapEntry(key, value.toJson()),
      );
    }

    return {
      'events': encodeSection(events),
      'signals': encodeSection(signals),
    };
  }
}

class _SuggestionEntry {
  _SuggestionEntry({
    required this.occurrenceTimestamps,
    required this.dismissed,
  });

  final List<int> occurrenceTimestamps;
  final Set<SimpleRecurrence> dismissed;

  static const _maxSamples = 10;

  SimpleRecurrence? get suggestedRecurrence {
    final occurrences = occurrenceTimestamps
        .map(DateTime.fromMillisecondsSinceEpoch)
        .toList()
      ..sort();
    if (occurrences.length < 3) {
      return null;
    }
    final intervals = <Duration>[];
    for (var i = 1; i < occurrences.length; i++) {
      intervals.add(occurrences[i].difference(occurrences[i - 1]));
    }

    SimpleRecurrence? candidate;

    bool roughlyEvery(Duration expected, {int toleranceDays = 1}) {
      if (intervals.isEmpty) return false;
      final recent = intervals.length >= 3
          ? intervals.sublist(intervals.length - 3)
          : intervals;
      final expectedDays = expected.inDays;
      return recent.every((interval) {
        final diff = interval.inDays;
        return (diff - expectedDays).abs() <= toleranceDays;
      });
    }

    if (roughlyEvery(const Duration(days: 7))) {
      candidate = SimpleRecurrence.weekly;
    } else if (roughlyEvery(const Duration(days: 14), toleranceDays: 2)) {
      candidate = SimpleRecurrence.biweekly;
    } else {
      final recent = intervals.length >= 3
          ? intervals.sublist(intervals.length - 3)
          : intervals;
      final monthly = recent.every((interval) {
        final days = interval.inDays;
        return days >= 27 && days <= 33;
      });
      if (monthly) {
        candidate = SimpleRecurrence.monthly;
      }
    }

    if (candidate == null || dismissed.contains(candidate)) {
      return null;
    }
    return candidate;
  }

  _SuggestionEntry addOccurrence(DateTime occurrence) {
    final updated = [...occurrenceTimestamps, occurrence.millisecondsSinceEpoch]
      ..sort();
    if (updated.length > _maxSamples) {
      updated.removeRange(0, updated.length - _maxSamples);
    }
    return _SuggestionEntry(
      occurrenceTimestamps: updated,
      dismissed: dismissed,
    );
  }

  _SuggestionEntry dismiss(SimpleRecurrence recurrence) {
    return _SuggestionEntry(
      occurrenceTimestamps: occurrenceTimestamps,
      dismissed: {...dismissed, recurrence},
    );
  }

  factory _SuggestionEntry.initial(DateTime occurrence) => _SuggestionEntry(
        occurrenceTimestamps: [occurrence.millisecondsSinceEpoch],
        dismissed: {},
      );

  factory _SuggestionEntry.fromJson(Map<String, dynamic> json) {
    final timestamps = (json['occurrenceTimestamps'] as List<dynamic>? ?? [])
        .whereType<num>()
        .map((value) => value.toInt())
        .toList();
    final dismissedList = (json['dismissed'] as List<dynamic>? ?? [])
        .whereType<String>()
        .map(
          (name) => SimpleRecurrence.values.firstWhere(
            (element) => element.name == name,
            orElse: () => SimpleRecurrence.oneOff,
          ),
        )
        .where((recurrence) => recurrence != SimpleRecurrence.oneOff)
        .toSet();

    return _SuggestionEntry(
      occurrenceTimestamps: timestamps,
      dismissed: dismissedList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'occurrenceTimestamps': occurrenceTimestamps,
      'dismissed': dismissed.map((r) => r.name).toList(),
    };
  }
}
