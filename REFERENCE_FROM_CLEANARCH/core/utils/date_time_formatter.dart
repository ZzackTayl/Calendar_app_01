part of 'utils.dart';

class DateTimeFormatter {
  /// Formats full date + time: "Wed, Nov 2 • 6:30 PM"
  static String formatDateTime(DateTime dateTime) {
    final weekday = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ][dateTime.weekday % 7];
    final month = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][dateTime.month - 1];
    final hour = dateTime.hour > 12
        ? dateTime.hour - 12
        : (dateTime.hour == 0 ? 12 : dateTime.hour);
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$weekday, $month ${dateTime.day} • $hour:$minute $period';
  }

  /// Formats time with dynamic timezone: "6:30 PM PDT"
  static String formatTime(DateTime dateTime, String timezone) {
    final hour = dateTime.hour > 12
        ? dateTime.hour - 12
        : (dateTime.hour == 0 ? 12 : dateTime.hour);
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    final minute = dateTime.minute.toString().padLeft(2, '0');

    // Extract short timezone (e.g., "PDT", "EST")
    final shortTz = _extractShortTimezone(timezone);
    return '$hour:$minute $period $shortTz';
  }

  /// Extracts short timezone like "PDT", "EST" from long string
  static String _extractShortTimezone(String timezone) {
    if (timezone.isEmpty) return 'UTC';

    // Match last part in parentheses: "Pacific Time (PST/PDT) (PDT)" → "PDT"
    final match = RegExp(r'\(([^()]+)\)$').firstMatch(timezone);
    if (match != null) {
      return match.group(1) ?? 'UTC';
    }

    // Fallback: try common patterns
    final common = {
      'Pacific Standard Time': 'PST',
      'Pacific Daylight Time': 'PDT',
      'Eastern Standard Time': 'EST',
      'Eastern Daylight Time': 'EDT',
      'Central Standard Time': 'CST',
      'Central Daylight Time': 'CDT',
      'Mountain Standard Time': 'MST',
      'Mountain Daylight Time': 'MDT',
    };

    return common[timezone] ?? timezone.split(' ').last;
  }
}
