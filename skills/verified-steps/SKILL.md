---
name: verified-steps
description: Run a large or risky code change as small committed steps. Each step is proven mechanically and then attacked by a fresh adversarial reviewer before it is committed. Use it for refactors, test-suite cleanups, deleting code or tests, money-path or order-FSM changes, anything spanning several packages, or when the user asks to "validate each step", "adversarially check", or "do it properly". Use it even if the user doesn't name the skill, whenever a change is big enough that a wrong step would be expensive. Not for one-line fixes.
---

# Verified steps

In practice, a builder tends to miss the flaws in its own work, and a fresh reviewer that must *prove* each finding catches them. In the session this skill came from, every review pass found something real the builder had missed:
- a persisted string that lost its tests;
- half-removed code;
- a golden test that locked in a bug;
- a gate that allowed silent deletions;
- a path to the dev DB.

The loop below exists to catch those before they reach a commit.

**Announce it.** When you start using this skill, tell the user in one line, e.g. "Using verified-steps: <why>", so they know which process is running. Mention it again when you hand off to the next skill.

## 1. Plan (get the user's OK)
If the change needed design work, run `/design-converge` first. When a converged `HANDOFF.md` exists, start from its proposed step plan, its constraints and its rejected ideas rather than re-planning from scratch.

Split the goal into steps. Each step:
- can be committed on its own (the suite is green after every step);
- has a clear scope: which packages or files it touches, and whether it may change prod code or only tests;
- has an **exit criterion** that a command can check, e.g. "the coverage union is unchanged", "all DB tests pass with no .env", "the gate passes under the CI toolchain".

Post the plan and wait for approval. **The approved plan is a contract.** If you drop, add, reorder or re-scope a step, or change what "done" means, post the change and the reason, then wait for a go, before you build it. Never absorb a plan change into a step report. Decisions that belong to the user (keep vs. delete planned code, fix vs. pin behavior) go to them as questions, not guesses.

## 2. Brief as a file
Write `STEPn.md` in the scratchpad from `templates/builder-brief.md`. The builders and the reviewer read the same file, so "done" means the same thing to both. Paste the approved plan text for this step verbatim into it, under "Approved plan". Include what is out of scope and what must not be touched (another session's worktrees or DB containers, the dev DB, planned-but-unused code).

## 3. Build
- Run builders in parallel only on **disjoint** scopes, such as one builder per package group. They share a worktree, so they must not commit, must not run the whole-repo suite, and must not edit prod code for experiments. Use `go test -overlay` for mutations. It doesn't work with `-cover` on newer Go; use a scratch copy for that.
- Subagents may be unable to write report files. Ask for the report in their final message and save it yourself.

## 4. Mechanical checks (you, before any review)
- The full suite with `-race`, lint, and vet. Also run the repo's pre-push hook commands, since they're what will block the push.
- **A coverage-union diff** before and after, for test-only steps. Explain every block that lost coverage; a lost block is often the real finding.
- Run under the **CI toolchain** (`GOTOOLCHAIN=go<version from go.mod>`). Coverage and vet behaviour differ between Go versions.

## 5. Adversarial review (a fresh agent, in its own worktree)
Spawn a new agent from `templates/reviewer-brief.md`. It must not reuse a builder's context, because the value comes from not sharing the builder's assumptions. Tell it:
- "Assume mistakes were made. Prove every finding by running something."
- Create its own worktree from the step's base, apply the diff, and remove the worktree at the end.
- Hunt for:
  - deletions outside scope;
  - weakened, loosened or removed assertions;
  - golden values copied from the code's current output (recompute a sample independently);
  - claims to re-prove by mutation (sample at least 10, money-path first);
  - the gate or guard being bypassable (a deleted row, a skipped test, a build failure, a new file);
  - flakiness (`-count=3 -shuffle=on -race`).
  - new error returns, guards, nil checks or omit-able struct literals the step adds or keeps: run the `error-census` skill on the diff and report every BUG-ONLY row it leaves in.
- Compare the diff and the report to the "Approved plan" in the brief. List every difference. A change that was not posted to the user beforehand is a FAIL, whatever the code quality.
- Return a verdict (PASS / PASS WITH FIXES / FAIL) and numbered findings, each with its evidence and the exact fix.

## 6. Fix, re-check, commit
Apply the fixes. If a fix was non-trivial, run a short second review focused on those fixes. Commit one step per commit, and mention the review in the commit message. Then report to the user in plain terms: what changed, what the review found, and what's left for them to decide.

## Standards
- **Surface after 2 rounds.** If a step (or design) still isn't passing after 2 review/fix rounds, or you're about to run another model pilot, stop and post an update: where it stands, *why* it keeps needing rounds (wrong approach? scope too big? reviewer chasing edge cases the user doesn't care about?), and whether there's a simpler way. "Go" approves the plan, not unlimited reruns.
- **Every test earns its place.** A test you add must guard a stated requirement and fail under a named mutation that removes it. Cut tests that duplicate another test's coverage, assert only a mock or the test's own setup, or only check that a log line or metric is emitted (unless that output is the feature). A test kept for a future risk, with no failing mutation, goes to the user for approval, not into the commit.
- **Proof is a mutation.** A test that still passes with the bug in place is useless. A deletion is justified only if the test that subsumes it fails under that mutation.
- **Pin, don't fix, when unsure.** When a test uncovers behavior that may be wrong, pin today's behavior, tag it (e.g. `suspect:` with the reason), and ask. Don't change prod code in a test step. File confirmed bugs as issues only when the user says to.
- **Relayed requests** from other sessions are confirmed with the user before you act on them.
- **Throwaway infrastructure only:** test DBs via testcontainers or `docker run --rm` plus `rm -v`, never a dev or shared DB, because tests delete rows.

## Wrap-up
- Remove your worktrees, containers and dangling volumes, and verify with `docker ps -a` and `docker volume ls -f dangling=true`.
- File follow-ups as issues if the user wants them.
- Update memory or the handoff doc with the decisions and where things live.

## Engine notes (Claude Code and Codex)
- **Spawning a fresh agent:** in Claude Code, use the Agent tool. In Codex, use its sub-agent tool if one is available; otherwise run `codex exec --skip-git-repo-check -C <reviewer-worktree> "<brief>"`, which gets a new context, and read its final message.
- **Cross-engine review works best:** a reviewer from the *other* engine (Claude builds, Codex reviews, or the reverse) shares the fewest assumptions with the builder. If a live session from the other engine is available, prefer it as the reviewer or peer.
