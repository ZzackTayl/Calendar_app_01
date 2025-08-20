# Cursor Rules (Project Pointers)

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

