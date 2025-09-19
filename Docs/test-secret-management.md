# Test Secret Management Playbook

## Overview
The testing stack no longer ships with baked-in credentials. Every test runner (Vitest, Docker Compose profiles, GitHub workflows) now loads its secrets from environment-sourced files that are generated on demand. The `scripts/prepare-test-secrets.ts` helper produces ephemeral values whenever CI secrets are absent, guaranteeing predictable inputs without exposing static keys in the repository.

## Preparing Secrets Locally
1. Install dependencies: `npm ci`.
2. Generate a non-committed secret bundle:
   ```bash
   npm run prepare:test-env -- --out config/testing/.env.testing.local
   ```
3. Export the file before running Docker Compose:
   ```bash
   export TEST_ENV_FILE=config/testing/.env.testing.local
   set -a && source "$TEST_ENV_FILE" && set +a
   ```
4. Vitest automatically loads the same file via `config/testing/register-test-secrets.ts`, so no additional steps are required for `npm run test:*` commands.

## CI/CD Integration
- Every workflow now calls `npm run prepare:test-env -- --out $TEST_ENV_FILE` immediately after dependency installation.
- The generated file path is written to `$GITHUB_ENV` alongside the resolved variables so subsequent steps inherit the values.
- Docker Compose invocations use `--env-file "$TEST_ENV_FILE"` to guarantee the same secret material inside containers.
- GitHub repository secrets (when defined) override generated values automatically.

### Required Environment Keys
`TEST_DB_PASSWORD`, `SUPABASE_DB_PASSWORD`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_KEY`, `TEST_JWT_SECRET`, `TEST_ENCRYPTION_KEY`, `TEST_CSRF_SECRET`, `KEY_DERIVATION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`.

## Checklist – Secret Paths Hardened
- [x] Vitest configs load from `process.env` only – no hard-coded defaults remain.
- [x] Shared test setup files validate required variables at runtime.
- [x] `docker-compose.test.yml` and `docker-compose.testing.yml` require environment-provided secrets (Compose fails fast if they are missing).
- [x] GitHub workflows (`comprehensive-testing.yml`, `codeql-analysis.yml`, `security-tests.yml`) generate/import secret files instead of embedding placeholder values.
- [x] `tests/scripts/validate-security-config.js` guidance updated to reflect the environment-driven workflow.
- [x] `.gitignore` shields newly generated secret bundles from version control.

## Coordination Notes
1. **Docker/Infra** – Compose commands now expect `--env-file "$TEST_ENV_FILE"`. Any scripted Docker usage (local or CI) must export the generated file path before invoking Compose.
2. **Performance Harness** – The performance profile inherits the same secrets; ensure load-test jobs call the prepare script before launching Docker.
3. **Security Automation** – The simple security workflow replaced the hard-coded `.env.test` with the generator. Update any external tooling that previously expected that file artifact.

## Validation Snapshot
- `npm run test:unit` (fails due to existing API contract assertions unrelated to secret handling; reproduction logs retained in task summary).
- Secret generation verified locally via `npm run prepare:test-env` output.
