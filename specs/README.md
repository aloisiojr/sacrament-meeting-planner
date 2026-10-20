# specs/

For dev-flow changes, one pair of files per change:

- `<slug>.md` — the spec: problem, in/out of scope, EARS acceptance criteria. **The anchor.**
- `<slug>.plan.md` — the atomic implementation plan (steps → AC → tests, reuse list, risks).

Audit-remediation waves and doc-only changes use a single `<slug>.md` outcome record
instead (the plan lives in the wave's brief): e.g. `architecture-wave6.md`,
`cleanup-wave7.md`. A spec whose work shipped carries its real status in the header —
never leave a built spec claiming `draft`.

See `~/.claude/dev-flow/doc-model.md`. Running state is in `../PROGRESS.md`. ADRs — only for
genuinely architectural decisions — go in `../docs/decisions/`.
