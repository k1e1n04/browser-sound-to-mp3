---
description: "Create a Conventional Commit from current git changes"
---

Use the `commit` skill from personal skills (`~/.codex/skills/commit/SKILL.md`) and execute the commit end-to-end:

1. Run `git status --short`.
2. Review both `git diff --staged` and `git diff`.
3. Choose the best Conventional Commit type/scope.
4. Stage appropriate files if needed.
5. Create the commit with a properly formatted message.

Constraints:
- Never include `Co-Authored-By` lines.
- Do not amend existing commits unless explicitly requested.
- If there are no changes, report that clearly instead of forcing an empty commit.
