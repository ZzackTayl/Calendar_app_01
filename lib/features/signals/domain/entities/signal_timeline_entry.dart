import 'package:equatable/equatable.dart';

/// Timeline entry describing key availability signal events.
class SignalTimelineEntry extends Equatable {
  final String id;
  final SignalTimelineType type;
  final DateTime timestamp;
  final String headline;
  final String? subheadline;
  final String? signalId;
  final String? partnerId;
  final bool isOwner;

  const SignalTimelineEntry({
    required this.id,
    required this.type,
    required this.timestamp,
    required this.headline,
    this.subheadline,
    this.signalId,
    this.partnerId,
    this.isOwner = false,
  });

  @override
  List<Object?> get props => [
        id,
        type,
        timestamp,
        headline,
        subheadline,
        signalId,
        partnerId,
        isOwner,
      ];
}

enum SignalTimelineType {
  created,
  shared,
  extended,
  ended,
  reminder,
}
