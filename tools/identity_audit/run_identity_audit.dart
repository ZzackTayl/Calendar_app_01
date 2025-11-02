import 'dart:convert';
import 'dart:io';

/// Simple runner for the production-state audit queries documented in
/// `docs/migration/supabase_identity_linking.md`.
///
/// This script shells out to the `bq` and `gcloud` CLIs so that credentials and
/// IAM policies remain scoped to the tooling engineers already use. Make sure
/// the Google Cloud SDK is installed and authenticated before executing:
///
/// ```bash
/// gcloud auth login
/// gcloud config set project $FIREBASE_PROJECT_ID
/// ```
///
/// Usage:
/// ```
/// dart run tools/identity_audit/run_identity_audit.dart [--since-days 30]
/// ```
///
/// Environment variables:
/// - FIREBASE_PROJECT_ID (required)
/// - BIGQUERY_ANALYTICS_DATASET (required, e.g. analytics_123456789)
/// - BIGQUERY_IDENTITY_SNAPSHOT_TABLE (required, e.g. identity.identity_profile_snapshot)
/// - FIRESTORE_USERS_COLLECTION (optional, default: users)
/// - AUDIT_OUTPUT_DIR (optional, default: build/audits)
Future<void> main(List<String> args) async {
  final sinceDays = _parseSinceDays(args);

  final projectId = _requireEnv('FIREBASE_PROJECT_ID');
  final analyticsDataset = _requireEnv('BIGQUERY_ANALYTICS_DATASET');
  final identitySnapshotTable = _requireEnv('BIGQUERY_IDENTITY_SNAPSHOT_TABLE');
  final firestoreCollection =
      _readEnv('FIRESTORE_USERS_COLLECTION') ?? 'users';
  final outputDir =
      Directory(_readEnv('AUDIT_OUTPUT_DIR') ?? 'build/audits/identity');

  stdout.writeln('🔍 Running production identity audit (last $sinceDays days)…');

  final eventQueryResult = await _runBigQuery(
    label: 'Supabase Identifiers in Analytics Events',
    sql: _buildEventsQuery(analyticsDataset, sinceDays),
  );

  final profileQueryResult = await _runBigQuery(
    label: 'Profiles Flagged with Supabase Provider',
    sql: _buildProfileSnapshotQuery(identitySnapshotTable),
  );

  final firestoreResult = await _runFirestoreScan(
    projectId: projectId,
    collectionPath: firestoreCollection,
  );

  final eventRow =
      (eventQueryResult['firstRow'] as Map<String, dynamic>? ?? {});
  final profileRow =
      (profileQueryResult['firstRow'] as Map<String, dynamic>? ?? {});
  final analyticsSummary = {
    'eventCount': _parseInt(eventRow['event_count']),
    'affectedUsers': _parseInt(eventRow['affected_users']),
    'samples': eventRow['sample_supabase_uids'],
  };
  final profileSummary = {
    'totalProfiles': _parseInt(profileRow['total_profiles']),
    'profilesWithSupabaseUid':
        _parseInt(profileRow['profiles_with_supabase_uid']),
    'sampleUserIds': profileRow['sample_user_ids'],
  };

  final issues = _summariseIssues(
    eventQueryResult: eventQueryResult,
    profileQueryResult: profileQueryResult,
    firestoreResult: firestoreResult,
  );

  await _persistResults(
    outputDir: outputDir,
    payload: {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'projectId': projectId,
      'sinceDays': sinceDays,
      'events': {
        ...eventQueryResult,
        'summary': analyticsSummary,
      },
      'profiles': {
        ...profileQueryResult,
        'summary': profileSummary,
      },
      'firestoreDocuments': firestoreResult,
      'issuesFound': issues.isNotEmpty,
      'issues': issues,
    },
  );

  if (issues.isEmpty) {
    stdout.writeln('✅ No Supabase identity remnants detected.');
    return;
  }

  stderr.writeln('🚨 Issues detected:');
  for (final entry in issues.entries) {
    stderr.writeln(' • ${entry.key}: ${entry.value}');
  }
  // Non-zero exit code so CI/CD can alert.
  exitCode = 2;
}

int _parseSinceDays(List<String> args) {
  const defaultSince = 30;
  if (args.isEmpty) {
    return defaultSince;
  }

  for (var i = 0; i < args.length; i++) {
    final arg = args[i];
    if (arg == '--since-days' && i + 1 < args.length) {
      return int.tryParse(args[i + 1]) ?? defaultSince;
    }
  }
  return defaultSince;
}

Future<Map<String, dynamic>> _runBigQuery({
  required String label,
  required String sql,
}) async {
  stdout.writeln('  • BigQuery: $label');
  final process = await Process.run(
    'bq',
    [
      'query',
      '--use_legacy_sql=false',
      '--format=json',
      sql,
    ],
    runInShell: true,
  );

  if (process.exitCode != 0) {
    stderr.writeln(process.stderr);
    throw ProcessException(
      'bq',
      ['query', '--use_legacy_sql=false', '--format=json', sql],
      'BigQuery command failed',
      process.exitCode,
    );
  }

  final raw = process.stdout.toString();
  final decoded = jsonDecode(raw) as List<dynamic>;
  final row = decoded.isNotEmpty
      ? decoded.first as Map<String, dynamic>
      : <String, dynamic>{};

  return {
    'rows': decoded,
    'firstRow': row,
  };
}

Future<Map<String, dynamic>> _runFirestoreScan({
  required String projectId,
  required String collectionPath,
}) async {
  stdout.writeln(
    '  • Firestore: scanning $collectionPath for Supabase identifiers',
  );
  final process = await Process.run(
    'gcloud',
    [
      'alpha',
      'firestore',
      'documents',
      'list',
      collectionPath,
      '--project',
      projectId,
      '--format',
      'json',
    ],
    runInShell: true,
  );

  if (process.exitCode != 0) {
    stderr.writeln(process.stderr);
    throw ProcessException(
      'gcloud',
      [
        'alpha',
        'firestore',
        'documents',
        'list',
        collectionPath,
        '--project',
        projectId,
        '--format',
        'json',
      ],
      'Firestore command failed',
      process.exitCode,
    );
  }

  final raw = process.stdout.toString();
  final decoded = jsonDecode(raw);

  final List<dynamic> documents;
  if (decoded is List<dynamic>) {
    documents = decoded;
  } else if (decoded is Map<String, dynamic>) {
    documents = (decoded['documents'] as List<dynamic>? ?? <dynamic>[]);
  } else {
    documents = <dynamic>[];
  }

  final filtered = documents.where((doc) {
    if (doc is! Map<String, dynamic>) return false;
    final fields = doc['fields'] as Map<String, dynamic>? ?? {};
    final supabaseUid = fields['supabaseUid']?['stringValue'];
    final legacyProvider =
        (fields['legacyProvider']?['stringValue'] as String?) ?? '';
    return supabaseUid != null || legacyProvider == 'supabase';
  }).cast<Map<String, dynamic>>().toList();

  final samples = filtered.take(25).map((doc) {
    final fields = doc['fields'] as Map<String, dynamic>? ?? {};
    final supabaseUid = fields['supabaseUid']?['stringValue'];
    final legacyProvider = fields['legacyProvider']?['stringValue'];
    return {
      'name': doc['name'],
      if (supabaseUid != null) 'supabaseUid': supabaseUid,
      if (legacyProvider != null) 'legacyProvider': legacyProvider,
    };
  }).toList();

  return {
    'scannedDocuments': documents.length,
    'supabaseMatches': filtered.length,
    'samples': samples,
  };
}

Map<String, String> _summariseIssues({
  required Map<String, dynamic> eventQueryResult,
  required Map<String, dynamic> profileQueryResult,
  required Map<String, dynamic> firestoreResult,
}) {
  final issues = <String, String>{};

  final eventRow =
      (eventQueryResult['firstRow'] as Map<String, dynamic>? ?? {});
  final analyticsUsers = _parseInt(eventRow['affected_users']);
  if (analyticsUsers > 0) {
    issues['analytics'] =
        'Analytics dataset contains $analyticsUsers users with Supabase identifiers.';
  }

  final profileRow =
      (profileQueryResult['firstRow'] as Map<String, dynamic>? ?? {});
  final profilesCount = _parseInt(profileRow['profiles_with_supabase_uid']);
  if (profilesCount > 0) {
    issues['profiles'] =
        '$profilesCount identity profiles still reference Supabase UIDs.';
  }

  if ((firestoreResult['supabaseMatches'] as int? ?? 0) > 0) {
    issues['firestore'] =
        '${firestoreResult['supabaseMatches']} Firestore documents still contain Supabase identifiers.';
  }

  return issues;
}

Future<void> _persistResults({
  required Directory outputDir,
  required Map<String, dynamic> payload,
}) async {
  if (!outputDir.existsSync()) {
    outputDir.createSync(recursive: true);
  }
  final timestamp =
      DateTime.now().toUtc().toIso8601String().replaceAll(':', '-');
  final file = File('${outputDir.path}/identity_audit_$timestamp.json');
  await file.writeAsString(
    const JsonEncoder.withIndent('  ').convert(payload),
  );
  stdout.writeln('  ↳ Results persisted to ${file.path}');
}

String _buildEventsQuery(String dataset, int sinceDays) => '''
SELECT
  COUNT(1) AS event_count,
  COUNT(DISTINCT user_pseudo_id) AS affected_users,
  APPROX_TOP_COUNT(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'supabase_user_id'),
    10
  ) AS sample_supabase_uids
FROM `$dataset.events_*`
WHERE PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL $sinceDays DAY)
  AND CURRENT_DATE()
  AND EXISTS (
    SELECT 1 FROM UNNEST(event_params) WHERE key = 'supabase_user_id'
  );
''';

String _buildProfileSnapshotQuery(String table) => '''
SELECT
  COUNT(*) AS total_profiles,
  COUNTIF(identity.supabase_uid IS NOT NULL) AS profiles_with_supabase_uid,
  ARRAY_AGG(DISTINCT user_id LIMIT 25) AS sample_user_ids
FROM `$table`
WHERE snapshot_date = CURRENT_DATE();
''';

String _requireEnv(String key) {
  final value = _readEnv(key);
  if (value == null || value.isEmpty) {
    throw StateError('Missing required environment variable: $key');
  }
  return value;
}

String? _readEnv(String key) => Platform.environment[key];

int _parseInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}
