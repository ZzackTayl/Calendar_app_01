part of 'widgets.dart';

class CustomText extends StatelessWidget {
  final String text;
  final double fontSize;
  final FontWeight fontWeight;
  final Color color;
  final TextAlign textAlign;
  final int? maxLines;
  final TextOverflow overflow;

  const CustomText(
    this.text, {
    super.key,
    this.fontSize = 14,
    this.fontWeight = FontWeight.w400,
    this.color = AppColors.textPrimary,
    this.textAlign = TextAlign.start,
    this.maxLines,
    this.overflow = TextOverflow.clip,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
      ),
    );
  }
}
