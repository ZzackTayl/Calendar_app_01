import 'dart:developer' as developer;
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:myorbit_calendar/core/env.dart';

import '../../core/result.dart';

/// Service for sending SMS messages via Twilio API
class SmsService {
  static const String _twilioApiUrl = 'https://api.twilio.com/2010-04-01/Accounts';

  /// Send an SMS message to a phone number
  static Future<Result<void>> sendSms({
    required String toPhoneNumber,
    required String message,
    String? fromPhoneNumber,
  }) async {
    try {
      // Validate environment is properly configured
      final accountSid = Env.twilioAccountSid;
      final authToken = Env.twilioAuthToken;
      
      if (accountSid.isEmpty || authToken.isEmpty) {
        return const Failure('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      }

      // Use provided from number or default to configured one
      final fromNumber = fromPhoneNumber ?? Env.twilioPhoneNumber;
      if (fromNumber.isEmpty) {
        return const Failure('Twilio sender number not configured. Please set TWILIO_PHONE_NUMBER environment variable.');
      }

      // Validate phone number format
      if (!isValidPhoneNumber(toPhoneNumber)) {
        return const Failure('Invalid phone number format. Please provide a valid phone number in E.164 format (e.g., +1234567890).');
      }

      // Create Dio client with authentication
      final dio = Dio();
      dio.options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      dio.options.headers['Authorization'] = 
          'Basic ${_base64Encode('$accountSid:$authToken')}';

      // Send request to Twilio API
      final response = await dio.post(
        '$_twilioApiUrl/$accountSid/Messages.json',
        data: {
          'From': fromNumber,
          'To': toPhoneNumber,
          'Body': message,
        },
      );

      if (response.statusCode == 201) {
        developer.log(
          'SMS sent successfully to $toPhoneNumber: $message',
          name: 'SmsService',
        );
        return const Success(null);
      } else {
        return Failure(
          'Failed to send SMS. Server responded with status: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      developer.log(
        'Dio error sending SMS: ${e.message}',
        name: 'SmsService',
        error: e,
      );
      return Failure('Failed to send SMS: ${e.message}');
    } on Exception catch (e) {
      developer.log(
        'Error sending SMS: $e',
        name: 'SmsService',
        error: e,
      );
      return Failure('Failed to send SMS: $e');
    }
  }

  /// Validate that a phone number is in E.164 format
  static bool isValidPhoneNumber(String phoneNumber) {
    // E.164 format: + followed by 1-15 digits
    final e164Regex = RegExp(r'^\+\d{1,15}$');
    return e164Regex.hasMatch(phoneNumber);
  }

  /// Base64 encode a string
  static String _base64Encode(String input) {
    return base64Encode(utf8.encode(input));
  }
}

/// Base64 encode utility function
String base64Encode(List<int> input) {
  return base64.encode(input);
}