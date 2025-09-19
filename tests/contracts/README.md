# Contract Testing Harness

This directory contains the consumer-driven contract tests authored with the Pact V3 API. The harness is intended to exercise high-risk API boundaries before provider verification is wired into the CI pipeline.

## Folder Structure

- `setup/` – helpers for creating Pact clients and shared utilities.
- `states/` – provider state definitions consumed by consumer and provider tests.
- `matchers/` – reusable matcher helpers (privacy levels, UUIDs, timestamps, etc.).
- `auth/` – contract suites for the authentication surface area.
- `fixtures/` – static payloads (ICS files, JSON blobs) used across contracts.
- `providers/` – provider verification suites (to be filled out as roll-out continues).

## Running the Suite

```bash
npm run test:contracts
```

The script sets `TEST_TYPE=contract`, switches Vitest into a Node environment, and executes only files under `tests/contracts/**`. Individual suites can be targeted with `npx vitest run tests/contracts/<path>.test.ts`.

## Output

Generated Pact files are written to `contracts/pact/<consumer>-<provider>.json`. Logs are stored under `contracts/pact/logs`.

## Next Steps

- Add additional provider states in `tests/contracts/states` as new endpoints are modeled.
- Mirror the consumer contracts with provider verification tests in `tests/contracts/providers`.
- Wire the `npm run test:contracts` command into the testing compose profile once the rollout gating criteria are met.
