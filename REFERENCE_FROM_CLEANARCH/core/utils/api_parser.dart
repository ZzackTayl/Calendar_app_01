part of 'utils.dart';

class ApiListParser<T> {
  final String tag;
  final T Function(Map<String, dynamic>) fromJson;
  final LoggerUtils logger;

  ApiListParser({
    required this.tag,
    required this.fromJson,
    required this.logger,
  });

  List<T> parseListResponse(Response response) {
    try {
      final data = response.data;
      if (data is Map<String, dynamic> && data.containsKey('results')) {
        final List results = data['results'] as List;
        return results
            .map((item) => fromJson(item as Map<String, dynamic>))
            .toList();
      }
      logger.logError(tag, 'Invalid response format');
      return [];
    } catch (e) {
      logger.logError(tag, 'Failed to parse response: $e');
      return [];
    }
  }
}
