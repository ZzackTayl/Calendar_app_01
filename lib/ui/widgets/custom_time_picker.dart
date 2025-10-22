import 'package:flutter/material.dart';
import '../../core/responsive_utils.dart';
import 'package:flutter/services.dart';
import '../../core/theme_constants.dart';

class CustomTimePicker extends StatefulWidget {
  final TimeOfDay initialTime;
  final String title;

  const CustomTimePicker({
    super.key,
    required this.initialTime,
    this.title = 'Select time',
  });

  @override
  State<CustomTimePicker> createState() => _CustomTimePickerState();
}

class _CustomTimePickerState extends State<CustomTimePicker> {
  late int _selectedHour;
  late int _selectedMinute;
  late bool _isAM;

  @override
  void initState() {
    super.initState();
    _selectedHour = widget.initialTime.hourOfPeriod;
    _selectedMinute = widget.initialTime.minute;
    _isAM = widget.initialTime.period == DayPeriod.am;
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return Dialog(
      backgroundColor: palette.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Title
            Text(
              widget.title,
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 24),

            // Time Display
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Hour
                _buildTimeBox(
                  value: _selectedHour.toString(),
                  label: 'Hour',
                  onTap: () => _showHourPicker(),
                ),
                const SizedBox(width: 16),
                Text(
                  ':',
                  style: textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(width: 16),
                // Minute
                _buildTimeBox(
                  value: _selectedMinute.toString().padLeft(2, '0'),
                  label: 'Minute',
                  onTap: () => _showMinutePicker(),
                ),
                const SizedBox(width: 16),
                // AM/PM
                _buildAMPMSelector(),
              ],
            ),

            const SizedBox(height: 32),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: palette.textSecondary,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      int hour24;
                      if (_selectedHour == 12) {
                        hour24 = _isAM ? 0 : 12;
                      } else {
                        hour24 = _isAM ? _selectedHour : _selectedHour + 12;
                      }
                      final time = TimeOfDay(
                        hour: hour24,
                        minute: _selectedMinute,
                      );
                      Navigator.of(context).pop(time);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.cardBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'OK',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeBox({
    required String value,
    required String label,
    required VoidCallback onTap,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: palette.divider,
            width: 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: textTheme.bodySmall?.copyWith(
                color: palette.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAMPMSelector() {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;

    return Column(
      children: [
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() {
              _isAM = true;
            });
          },
          child: Container(
            width: 60,
            height: 40,
            decoration: BoxDecoration(
              color: _isAM ? AppColors.cardBlue : palette.surface,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
              border: Border.all(
                color: palette.divider,
                width: 1,
              ),
            ),
            child: Center(
              child: Text(
                'AM',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: _isAM ? Colors.white : palette.textSecondary,
                ),
              ),
            ),
          ),
        ),
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            setState(() {
              _isAM = false;
            });
          },
          child: Container(
            width: 60,
            height: 40,
            decoration: BoxDecoration(
              color: !_isAM ? AppColors.cardBlue : palette.surface,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
              border: Border.all(
                color: palette.divider,
                width: 1,
              ),
            ),
            child: Center(
              child: Text(
                'PM',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: !_isAM ? Colors.white : palette.textSecondary,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showHourPicker() {
    final palette = AppPalette.of(context);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Select Hour',
          style: TextStyle(
            color: palette.textPrimary,
            fontSize: 18,
          ),
        ),
        content: SizedBox(
          width: 200,
          height: 300,
          child: ListView.builder(
            itemCount: 12,
            itemBuilder: (context, index) {
              final hour = index + 1;
              final isSelected = hour == _selectedHour;

              return ListTile(
                title: Text(
                  hour.toString(),
                  style: TextStyle(
                    color:
                        isSelected ? AppColors.cardBlue : palette.textPrimary,
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 16,
                  ),
                ),
                selected: isSelected,
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() {
                    _selectedHour = hour;
                  });
                  Navigator.of(context).pop();
                },
              );
            },
          ),
        ),
      ),
    );
  }

  void _showMinutePicker() {
    final palette = AppPalette.of(context);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: palette.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text(
          'Select Minute',
          style: TextStyle(
            color: palette.textPrimary,
            fontSize: 18,
          ),
        ),
        content: SizedBox(
          width: 200,
          height: 300,
          child: ListView.builder(
            itemCount: 60,
            itemBuilder: (context, index) {
              final minute = index;
              final isSelected = minute == _selectedMinute;

              return ListTile(
                title: Text(
                  minute.toString().padLeft(2, '0'),
                  style: TextStyle(
                    color:
                        isSelected ? AppColors.cardBlue : palette.textPrimary,
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 16,
                  ),
                ),
                selected: isSelected,
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() {
                    _selectedMinute = minute;
                  });
                  Navigator.of(context).pop();
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

// Helper function to show the custom time picker
Future<TimeOfDay?> showCustomTimePicker({
  required BuildContext context,
  required TimeOfDay initialTime,
  String title = 'Select time',
}) {
  return showDialog<TimeOfDay>(
    context: context,
    builder: (context) => CustomTimePicker(
      initialTime: initialTime,
      title: title,
    ),
  );
}
