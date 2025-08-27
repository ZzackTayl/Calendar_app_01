# GEMINI Rules

Use PACT:

- Plan: outline concise steps; confirm assumptions.
- Act: implement minimal diffs; keep code readable; run sanity checks.
- Check: lint/type-check/build before handing off; verify acceptance criteria.
- Tell: summarize changes and next steps.

Context pointers

- Overview: `README.md`, `CHANGELOG.md`
- Canonical docs: `docs/README.md`, `docs/SETUP_GUIDE.md`, `docs/PRD.md`, `docs/Handover.md`
- Code: `app/`, `components/ui/`, `lib/`, `schemas/mvp_schema.sql`

Conventions

- Avoid inline CSS; use Tailwind utilities or classes in `app/globals.css`.
- Keep root files as pointers; edit canonical docs in `docs/`.
- Don’t reformat unrelated code; keep diffs focused.

## Cursor Rules (Project Pointers)

- Canonical docs: see `docs/README.md` (index), `docs/SETUP_GUIDE.md`, `docs/PRD.md`.
- High‑level overview: `README.md`, recent changes in `CHANGELOG.md`.
- Code entry points: `app/`, `components/ui/`, `lib/`, `schemas/mvp_schema.sql`.
- Prefer canonical docs in `docs/`; root files are short pointers only.
- Keep diffs small; avoid unrelated reformatting; fix lint/type errors before finishing.
- Use Tailwind utilities or CSS classes; avoid inline styles (lint rule).
- For mobile UX, prefer native scrolling and snap; ensure accessibility.

MCP tools (use when they help the task):

- Context7 docs:
  - Resolve the library first, then fetch focused docs (APIs/options/usage). Start broad, then narrow; cite sources when decisions depend on docs.
- Sequential Thinking:
  - For complex or multi‑step problems: break work into steps, generate a solution hypothesis, verify against requirements, iterate until satisfied.
- Mem0 memory:
  - Before creating a memory, search for existing ones. Store user‑approved preferences, recurring decisions, and project conventions. Update or delete if superseded or contradicted.

Execution policy:

- Parallelize independent tool calls (multiple searches/reads) by default.
- Prefer semantic code search for exploration; use exact grep for precise symbols/strings.
- After any substantive edit, run lint/type‑check/tests/build if available and fix issues before handoff.

Collaboration:

- Ask permission before major structural/codebase changes.
- Present concise options with a recommended default; keep diffs focused.

## Security Principles

When implementing functionality, always apply comprehensive input validation:

- **Add comprehensive input validation to any functions that would make sense to from a security standpoint**: Validate data types, sanitize strings, check ranges for numbers, validate formats for emails/phones, and protect against common security issues like injection attacks

## Test-Driven Development

Use Test-Driven Development to implement key features:

- **First write comprehensive tests** that define the expected behavior, including edge cases and error conditions
- **Then implement just enough code** to make the tests pass

## Test Pyramid

Follow the test pyramid pattern when creating tests:

- **Create many fast unit tests** for individual functions and components
- **Create some integration tests** for service interactions
- **Create only a few end-to-end tests** for critical paths

## Test Quality Standards

Ensure all tests follow the FAST principles:

- **Fast**: Tests should have no external dependencies
- **Independent**: Each test should stand alone
- **Repeatable**: Use mocks to ensure consistent results
- **Self-Validating**: Clear assertions that are easy to understand
- **Timely**: Tests should be written during development

## Test Structure

Structure all tests using the Given-When-Then pattern:

- **Given**: Setup phase where preconditions are established
- **When**: Action phase where the actual behavior is triggered
- **Then**: Verification phase where results are checked

## Code Quality Standards

Define and enforce quality standards for all code:

- **Coverage**: Maintain appropriate code coverage thresholds
- **Complexity**: Keep cyclomatic complexity within acceptable limits
- **Security**: Follow security best practices and conduct regular checks
- **Automation**: Create automated checks to enforce these standards

## Design Principles

When designing and implementing code, follow these principles:

- **Prefer composition over inheritance**: Replace inheritance hierarchies with composition when needed
- **Create separate capability interfaces**: Design interfaces that can be combined flexibly
- **Enable flexible object composition**: Allow objects to be composed of different combinations of capabilities
- **Use dependency injection when needed**: Refactor classes to accept dependencies as constructor parameters
- **Remove direct instantiation**: Eliminate direct instantiation of dependencies in favor of injection
- **Implement service containers**: Create containers to manage dependency creation and lifecycle
- **Follow Tell, Don't Ask**: Instead of asking objects about their state and making decisions for them, tell them what you want and let them encapsulate their own decision logic
- **Follow the Law of Demeter**: Remove long method chains and create methods that provide exactly what's needed without exposing internal object structure
- **Create consistent service architecture**: Each service should have the same interface structure (create, update, delete, get, list), use standardized error handling, and follow predictable dependency injection patterns
