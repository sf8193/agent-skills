---
name: overnight-steps
description: Run a user-supplied list of product or code tasks unattended through verified-steps. Instead of pausing to ask questions when unsure on design or scope, orient to the repo's invariants, pick the best long-term solution, log every non-trivial choice in DECISIONS.md, and keep going. Use when the user hands off a list of work to execute overnight or unattended.
---

# Overnight steps

Autonomous overlay on `verified-steps` for a user-supplied list of work (product features, bug fixes, or refactors). It overrides one thing — waiting for user answers when unsure — while keeping every mechanical gate and fresh adversarial review intact.

**Announce it.** Tell the user in one line before starting: `Using overnight-steps: <N> items, logging decisions to <scratch>/DECISIONS.md`.

## 1. Ground yourself before Step 1
1. Read the target repo's `CLAUDE.md` / `AGENTS.md` invariants and CI workflow (`.github/workflows/`). Every mechanical check CI runs becomes a mandatory gate on every step.
2. Check active peer sessions and open PRs so you skip anything already owned or covered.
3. Create `<scratch>/DECISIONS.md` recording the target repo, base `origin/main` SHA, and the ordered item list.

## 2. Run the `verified-steps` loop sequentially
Work one item at a time as stacked PRs (`--base <prev-branch>`). Never edit the shared checkout directly; always work in a fresh scratch worktree. Never start Step N+1 while Step N's adversarial review is running.

For each step:
1. **Brief:** Write `<scratch>/STEP<n>.md` naming the problem, chosen long-term solution, out-of-scope boundaries, and exact verification commands.
2. **Build:** Implement in an isolated worktree branched from the previous step. Solve the root problem cleanly — never a quick patch.
3. **Mechanical checks:** Run every CI gate before review: typecheck, linters, owner/layer/cycle/ratchet scripts, all build targets, full test suite (using the repo's sanctioned test runner, never raw commands that touch live state), generated docs/topology checks, and plugin/mod validators when those files change.
4. **Fresh adversarial review:** Apply the diff in a separate detached reviewer worktree and run a fresh agent (prefer the *other* engine when available) with `STEP<n>.md` and the full diff. Tell it to assume mistakes were made, prove findings by running checks, and check the repo's invariants (`CLAUDE.md`). Delete the reviewer worktree when done.
5. **Fix, re-verify, ship:** Fix all real findings. On `FAIL` or non-trivial fixes, run a focused Round 2 fresh review. Commit one step per commit (mentioning the review), push, open a stacked PR, remove the step worktree, append decisions to `DECISIONS.md`, post a short progress line to the user's thread, and immediately start Step N+1.

## 3. When unsure: decide, log, continue
When a design choice, API boundary, migration path, or scope split is ambiguous, do **not** pause to ask the user:
1. Orient against the repo's invariants (`One owner per fact`, `No impossible-state code`, `Split deciding from acting`, `Fail closed`, `No work at import`, `Exception lists only shrink`).
2. Pick the best long-term solution — never the quickest patch.
3. Prove assumptions against live tools, git history, or code before encoding them (never speculate).
4. Record every non-trivial decision in `<scratch>/DECISIONS.md` with four fields:
   - **Choice:** what you decided
   - **Options considered:** the real alternatives
   - **Why this one:** the invariant or evidence that settled it
   - **PR:** the PR number

## 4. When to skip an item (never stall the whole run)
Do not stall the entire queue on one stuck item, and never guess past an irreversible boundary. Skip that item, log the reason in `DECISIONS.md`, and move to the next item when:
- A step still fails after **2 adversarial review rounds**.
- Another active session already owns the same issue or files.
- The work requires an irreversible external action (merging to `main`, mutating live production state/DBs/secrets, or unapproved paid API spend).
- Investigation reveals a massive cross-repo or persisted-schema rename (e.g. 50–100+ files) that would poison the rest of the stack with rebase conflicts — defer it for a clean branch directly off `main`.

## 5. Morning handoff (mandatory 3-part report)
Before closing out, verify zero stray scratch worktrees remain and the shared checkout is clean on `main`. Then send the user:
1. **Ordered PR stack** (bottom-up from `main`, one line per PR, plus any skipped/deferred items and why).
2. **`DECISIONS.md` walkthrough** — one concise bullet per decision with the 2–3 most opinionated calls flagged for quick audit, plus the path to `DECISIONS.md`.
3. **Honest invariant audit** — inspect the full stack diff (`git diff --stat main..<top-branch>`) against `CLAUDE.md` invariants and call out every compromise, second copy, transitional flag, or unrun check explicitly. Never round up to "all clean."
