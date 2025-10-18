import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/theme_constants.dart';
import '../../core/timezone_service.dart';
import '../../domain/event.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/quick_event_parser.dart';
import '../../core/supabase_client.dart';

class QuickEventSheetResult {
  const QuickEventSheetResult({
    required this.draft,
    this.openComposer = false,
  });

  final QuickEventDraft draft;
  final bool openComposer;
}

class QuickEventSheet extends ConsumerStatefulWidget {
  const QuickEventSheet({
    super.key,
    required this.timeZone,
  });

  final String timeZone;

  @override
  ConsumerState<QuickEventSheet> createState() => _QuickEventSheetState();
}

class _QuickEventSheetState extends ConsumerState<QuickEventSheet> {
  final TextEditingController _controller = TextEditingController();
  final QuickEventParser _parser = QuickEventParser();
  QuickEventParseResult? _result;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleInputChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_handleInputChanged);
    _controller.dispose();
    super.dispose();
  }

  void _handleInputChanged() {
    final text = _controller.text;
    if (text.trim().isEmpty) {
      setState(() => _result = null);
      return;
    }
    setState(() {
      _result = _parser.parse(
        text,
        timeZone: widget.timeZone,
      );
    });
  }

  Future<void> _createEvent() async {
    final parse = _parser.parse(
      _controller.text,
      timeZone: widget.timeZone,
    );
    setState(() {
      _result = parse;
    });
    if (!parse.isValid) {
      return;
    }
    final draft = parse.draft!;

    setState(() => _isSaving = true);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    final ownerId = SupabaseService.currentUser?.id ?? DevDataService.currentUserId;
    final event = CalendarEvent(
      id: const Uuid().v4(),
      title: draft.title,
      start: draft.start,
      end: draft.end,
      privacyLevel: EventPrivacyLevel.normal,
      invitedPartnerIds: const [],
      ownerId: ownerId,
    );

    try {
      await ref.read(eventListProvider.notifier).addEvent(event);
      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(
        SnackBar(content: Text('Added "${draft.title}"')),
      );
    } catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text('Could not create event: $error')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _openComposer() async {
    final parse = _parser.parse(
      _controller.text,
      timeZone: widget.timeZone,
    );
    setState(() {
      _result = parse;
    });
    if (!parse.isValid) {
      return;
    }
    final draft = parse.draft!;
    if (!mounted) return;
    Navigator.of(context).pop(
      QuickEventSheetResult(draft: draft, openComposer: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final result = _result;
    final isValid = result?.isValid ?? false;
    final warnings = result?.warnings ?? const <String>[];
    final errors = result?.errors ?? const <String>[];
    final abbreviation = TimezoneService.abbreviationFor(
      widget.timeZone,
      reference: DateTime.now(),
    );
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: AppShadows.cardElevated,
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 48,
                    height: 4,
                    decoration: BoxDecoration(
                      color: palette.divider,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Quick Event',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Interpreting times in ${widget.timeZone} ($abbreviation)',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _controller,
                  autofocus: true,
                  enabled: !_isSaving,
                  decoration: InputDecoration(
                    hintText: 'e.g. Lunch with Alex tomorrow at 1pm for 90 min',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppBorderRadius.large),
                    ),
                  ),
                  maxLines: 2,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _createEvent(),
                ),
                const SizedBox(height: 16),
                if (result != null) ...[
                  _ResultPreview(
                    result: result,
                    palette: palette,
                    timeZone: widget.timeZone,
                  ),
                  const SizedBox(height: 12),
                ],
                if (warnings.isNotEmpty)
                  _InlineNotice(
                    palette: palette,
                    icon: Icons.info_outline,
                    color: AppColors.eventOrange,
                    messages: warnings,
                  ),
                if (errors.isNotEmpty)
                  _InlineNotice(
                    palette: palette,
                    icon: Icons.error_outline,
                    color: AppColors.eventRed,
                    messages: errors,
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: isValid && !_isSaving ? _openComposer : null,
                        child: const Text('Add details…'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: isValid && !_isSaving ? _createEvent : null,
                        icon: _isSaving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.bolt),
                        label: const Text('Create'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ResultPreview extends StatelessWidget {
  const _ResultPreview({
    required this.result,
    required this.palette,
    required this.timeZone,
  });

  final QuickEventParseResult result;
  final AppPalette palette;
  final String timeZone;

  @override
  Widget build(BuildContext context) {
    final draft = result.draft;
    final theme = Theme.of(context);

    if (draft == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: palette.subtleSurface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Text('Not enough information yet.'),
      );
    }

    final formatted = TimezoneService.formatEventWindow(
      start: draft.start,
      end: draft.end,
      displayName: timeZone,
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.subtleSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: palette.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            draft.title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${formatted.dateLabel}\n${formatted.timeLabel}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: palette.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({
    required this.palette,
    required this.icon,
    required this.color,
    required this.messages,
  });

  final AppPalette palette;
  final IconData icon;
  final Color color;
  final List<String> messages;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: messages
                  .map(
                    (message) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        message,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: palette.textSecondary,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}
