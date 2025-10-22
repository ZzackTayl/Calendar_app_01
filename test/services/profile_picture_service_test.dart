import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/profile_picture_service.dart';

void main() {
  group('ProfilePictureService', () {
    group('isGifFile', () {
      test('correctly identifies GIF files', () {
        expect(ProfilePictureService.isGifFile('image.gif'), true);
        expect(ProfilePictureService.isGifFile('IMAGE.GIF'), true);
      });

      test('returns false for non-GIF files', () {
        expect(ProfilePictureService.isGifFile('image.png'), false);
        expect(ProfilePictureService.isGifFile('image.jpg'), false);
        expect(ProfilePictureService.isGifFile('image'), false);
      });
    });

    group('supportedFormats', () {
      test('includes PNG, JPEG, GIF', () {
        final formats = ProfilePictureService.supportedFormats;
        expect(formats, contains('png'));
        expect(formats, contains('jpg'));
        expect(formats, contains('jpeg'));
        expect(formats, contains('gif'));
      });

      test('returns list of 4 supported formats', () {
        final formats = ProfilePictureService.supportedFormats;
        expect(formats.length, 4);
      });
    });

    group('createThumbnailUrl', () {
      test('adds thumbnail query params to URL without existing params', () {
        final url = 'https://storage.supabase.co/image.png';
        final thumbnail = ProfilePictureService.createThumbnailUrl(url);

        expect(thumbnail, contains('?width=200&height=200'));
      });

      test('appends thumbnail query params to URL with existing params', () {
        final url = 'https://storage.supabase.co/image.png?v=1';
        final thumbnail = ProfilePictureService.createThumbnailUrl(url);

        expect(thumbnail, contains('&width=200&height=200'));
      });

      test('returns null for null URL', () {
        final thumbnail = ProfilePictureService.createThumbnailUrl(null);
        expect(thumbnail, isNull);
      });

      test('handles empty URL', () {
        final thumbnail = ProfilePictureService.createThumbnailUrl('');
        expect(thumbnail, contains('width=200'));
      });
    });

    group('validateImageFile', () {
      test('returns Failure for non-existent file', () async {
        // Arrange
        final testFile = File('test_assets/does_not_exist_12345.png');

        // Act
        final result = await ProfilePictureService.validateImageFile(testFile);

        // Assert
        expect(result.isSuccess, false);
        expect(result.errorOrNull, contains('does not exist'));
      });

      test('returns Failure for unsupported format', () async {
        // Arrange - create a temporary file with wrong extension
        final tempDir = Directory.systemTemp.createTempSync();
        final testFile = File('${tempDir.path}/test.webp');
        testFile.writeAsStringSync('fake webp data');

        try {
          // Act
          final result =
              await ProfilePictureService.validateImageFile(testFile);

          // Assert
          expect(result.isSuccess, false);
          expect(result.errorOrNull, contains('Unsupported'));
        } finally {
          testFile.deleteSync();
          tempDir.deleteSync();
        }
      });

      test('accepts valid PNG file', () async {
        // Arrange - create a temporary PNG file
        final tempDir = Directory.systemTemp.createTempSync();
        final testFile = File('${tempDir.path}/test.png');
        testFile.writeAsStringSync('fake png data');

        try {
          // Act
          final result =
              await ProfilePictureService.validateImageFile(testFile);

          // Assert
          expect(result.isSuccess, true);
        } finally {
          testFile.deleteSync();
          tempDir.deleteSync();
        }
      });
    });

    group('getFileSizeInMB', () {
      test('returns correct file size in MB', () async {
        // Arrange - create a temporary file with known size
        final tempDir = Directory.systemTemp.createTempSync();
        final testFile = File('${tempDir.path}/test.png');
        // Create a file with approximately 1MB
        testFile.writeAsStringSync('X' * (1024 * 1024));

        try {
          // Act
          final sizeInMB =
              await ProfilePictureService.getFileSizeInMB(testFile);

          // Assert
          expect(sizeInMB, closeTo(1.0, 0.01));
        } finally {
          testFile.deleteSync();
          tempDir.deleteSync();
        }
      });

      test('returns correct size for small files', () async {
        // Arrange
        final tempDir = Directory.systemTemp.createTempSync();
        final testFile = File('${tempDir.path}/test.jpg');
        testFile.writeAsStringSync('X' * 1024); // 1KB

        try {
          // Act
          final sizeInMB =
              await ProfilePictureService.getFileSizeInMB(testFile);

          // Assert
          expect(sizeInMB, lessThan(0.01)); // Less than 0.01 MB
        } finally {
          testFile.deleteSync();
          tempDir.deleteSync();
        }
      });
    });
  });

  group('ProfilePictureService - File format validation', () {
    test('validates all supported formats', () async {
      final tempDir = Directory.systemTemp.createTempSync();

      final formats = ['png', 'jpg', 'jpeg', 'gif'];
      for (final format in formats) {
        final testFile = File('${tempDir.path}/test.$format');
        testFile.writeAsStringSync('test data');

        try {
          final result =
              await ProfilePictureService.validateImageFile(testFile);
          expect(result.isSuccess, true,
              reason: 'Format $format should be valid');
        } finally {
          testFile.deleteSync();
        }
      }

      tempDir.deleteSync();
    });

    test('rejects unsupported formats', () async {
      final tempDir = Directory.systemTemp.createTempSync();

      final invalidFormats = ['webp', 'bmp', 'svg', 'tiff', 'txt'];
      for (final format in invalidFormats) {
        final testFile = File('${tempDir.path}/test.$format');
        testFile.writeAsStringSync('test data');

        try {
          final result =
              await ProfilePictureService.validateImageFile(testFile);
          expect(result.isSuccess, false,
              reason: 'Format $format should be invalid');
        } finally {
          testFile.deleteSync();
        }
      }

      tempDir.deleteSync();
    });
  });

  group('ProfilePictureService - Stress testing', () {
    test('handles rapid format checks without errors', () {
      for (int i = 0; i < 100; i++) {
        final path = 'image_$i.png';
        final isGif = ProfilePictureService.isGifFile(path);
        expect(isGif, false);
      }
    });

    test('handles rapid GIF detection checks', () {
      for (int i = 0; i < 100; i++) {
        final path = 'animation_$i.gif';
        final isGif = ProfilePictureService.isGifFile(path);
        expect(isGif, true);
      }
    });

    test('handles concurrent file size calculations', () async {
      final tempDir = Directory.systemTemp.createTempSync();
      final futures = <Future<double>>[];

      // Create multiple test files
      for (int i = 0; i < 5; i++) {
        final testFile = File('${tempDir.path}/test_$i.png');
        testFile.writeAsStringSync('X' * (1024 * 512)); // 512KB each

        futures.add(ProfilePictureService.getFileSizeInMB(testFile));
      }

      try {
        final sizes = await Future.wait(futures);

        // All sizes should be approximately 0.5MB
        for (final size in sizes) {
          expect(size, closeTo(0.5, 0.01));
        }
      } finally {
        final files = tempDir.listSync();
        for (final file in files) {
          file.deleteSync();
        }
        tempDir.deleteSync();
      }
    });

    test('thumbnail URL generation performance under load', () {
      final baseUrl =
          'https://storage.supabase.co/profile-pictures/user-123/profile_pic.png';

      for (int i = 0; i < 1000; i++) {
        final thumbnail = ProfilePictureService.createThumbnailUrl(baseUrl);
        expect(thumbnail, isNotNull);
        expect(thumbnail, contains('width=200'));
      }
    });
  });
}
