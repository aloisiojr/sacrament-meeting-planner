# specs/

One pair of files per change, created by the dev-flow loop:

- `<slug>.md` — the spec: problem, in/out of scope, EARS acceptance criteria. **The anchor.**
- `<slug>.plan.md` — the atomic implementation plan (steps → AC → tests, reuse list, risks).

See `~/.claude/dev-flow/doc-model.md`. Running state is in `../PROGRESS.md`. ADRs — only for
genuinely architectural decisions — go in `../docs/decisions/`.
