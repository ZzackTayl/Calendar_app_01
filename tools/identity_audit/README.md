# Identity Linking Production Audit Toolkit

This directory contains the runnable scripts that back the production-state
audits documented in
`docs/migration/supabase_identity_linking.md#production-state-audit-queries`.

## Prerequisites

- Google Cloud SDK (`gcloud`, `bq`) installed locally or on the CI runner
- Service account with the following IAM roles:
  - `roles/bigquery.dataViewer` (for the analytics dataset)
  - `roles/bigquery.jobUser`
  - `roles/datastore.viewer`
- Environment variables populated (examples below)

```bash
export FIREBASE_PROJECT_ID=myorbit-prod
export BIGQUERY_ANALYTICS_DATASET=analytics_987654321
export BIGQUERY_IDENTITY_SNAPSHOT_TABLE=identity.identity_profile_snapshot
# optional overrides
export FIRESTORE_USERS_COLLECTION=users
export AUDIT_OUTPUT_DIR=build/audits/identity
```

## Running Locally

```bash
dart pub get
dart run tools/identity_audit/run_identity_audit.dart --since-days 45
```

The script shells out to `bq` and `gcloud`, streams results to STDOUT, and
persists a JSON artefact under `build/audits/identity`.

An exit code of `0` means no Supabase identifiers were detected. The script
returns `2` if evidence of Supabase identity remnants is found so that CI/CD
pipelines can alert automatically.

## Scheduling

The repository ships a GitHub Actions workflow (`.github/workflows/identity_audit.yml`)
that runs nightly. Configure the following secrets to enable it:

- `GCP_PROJECT_ID`
- `GCP_SERVICE_ACCOUNT_KEY` (JSON)
- `BIGQUERY_ANALYTICS_DATASET`
- `BIGQUERY_IDENTITY_SNAPSHOT_TABLE`

Optionally override `FIRESTORE_USERS_COLLECTION` and `AUDIT_SINCE_DAYS` using
repository variables.

If you prefer Cloud Scheduler / Cloud Run, wrap the Dart script in a small
container image that executes the command above and trigger it via HTTP with the
appropriate environment variables.
