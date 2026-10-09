---
name: design-converge
description: Converge on a design before building a non-trivial change. The steps are a case matrix taken from the real code, a design doc with pseudocode, an audit of the design against every case, written critique from an independent peer, a log of the user's decisions, and a loop until there are no regressions or gaps. It ends in a handoff doc with a step plan for /verified-steps. Use it when the user wants to redesign or rethink something, asks "how should we…", "what's the right design", "let's talk through…", or wants to fix a class of recurring bugs. Use it for any money-path, order-FSM, concurrency or state-ownership change where getting the design wrong is expensive, even if the user doesn't name the skill. Not for mechanical work (cleanups, renames) or small fixes.
---

# Design converge

Designs judged in the abstract look fine and then break on the real edge cases. What worked (on a money-path design that went through several reviewers before the owner signed off) was to pin down the cases first, judge every design version against all of them, and have a peer with *different* context attack the design in writing. The user makes the decisions, and every round has to respect them.

Keep everything in one working folder in the scratchpad, and copy it somewhere durable (a wiki/project folder) at milestones, because `/tmp` doesn't survive a reboot.

**Announce it.** When you start using this skill, tell the user in one line, e.g. "Using design-converge: <why>", so they know which process is running. Mention it again when you hand off to the next skill.

## 1. Constraints first
Ask for, and write down at the top of the design doc, the facts the code can't tell you. Examples: rate limits, what must never be in the money path, "no new locks", what is handled manually, broker quirks. Constraints the user states during the discussion go in the same list immediately. Facts that hold for the whole system also go into the repo's CLAUDE.md, but only with the user's OK, since it is shared. Keep a **rejected-ideas list** so later rounds don't re-propose them.

## 2. Case matrix from the code
Before judging any design, enumerate the real scenarios from the code as it is today, with file:line for each: normal paths, races, failures and partial states. Then do a **branch-by-branch pass** over the functions involved and map each branch to a case, or mark it UNCOVERED. Scenario lists miss branches; the branch pass is how a real gap in that design (G1) was found. Record what happens *today* for each case, including behavior that looks wrong. Pinning today's behavior is the baseline.

**Ambiguous input? Ask.** If mapping the code turns up more than one plausible source or input for what the user asked (e.g. "transcripts" could mean chat history, Claude JSONL or Codex rollouts), stop and ask which one before drafting. Never pick on the user's behalf.

## 2b. Error census (only if the design adds, keeps or removes an error return, guard, retry or page; else write "census: n/a")
Add one column to the section 2 branch table for every error return, guard, fallback, retry and page: the **outside input** that causes it. Write the path as entry point → … → site (file:line), with the value the outside caller passes.
- No such path: the row is **BUG-ONLY** (only our own code can cause it). "A restart or a stream gap that our code mishandles" is BUG-ONLY, not an outside input.
- UNVERIFIED rows count as REAL and block convergence until traced or the user rules. A user ruling is logged with its date, and the row reads "REAL, excluded by user decision".
- A REAL row stays an error, handled in one place.
- A BUG-ONLY row is **removed by construction**, not guarded: take no input that could be wrong, build values through one constructor, hold the object instead of an ID, give each kind its own type. The design says which one, per row.
- An unexported error that in-package code still branches on has not been removed.
- The only runtime guard allowed is one generic report-and-continue guard that logs, pages once and returns nothing. Name the panic or bad state it covers. No per-error guards.
Deleting a BUG-ONLY guard is not a REGRESSION in section 4 (today's guard is pinned in section 2, then removed by design). A survivor (error, branch, retry or page) is a design defect and blocks convergence.

## 3. Design doc
Write `design.md` with pseudocode grounded in the real code (file:line). It should cover:
- what moves where, as a table of today's sites → new home;
- rollout, e.g. shadow → authoritative → delete;
- what is out of scope;
- open questions for the user.
State the claim the design makes, e.g. "fixes class X, not Y".

## 4. Audit design × cases
For every case, give a verdict: **same / fixed / changed (intentional) / out of scope / REGRESSION / GAP**, with the reasoning. A fresh agent should do this, not the author. Regressions and gaps block convergence. Changes need the user's sign-off. If the census applies, re-run it on the new design.

## 5. Independent peer critique, in writing
Use a peer with different context:
- If a live session owns the related code, ask that session.
- Otherwise spawn a fresh agent told to "find what's wrong with this design; ground every claim in the code".

The exchange lives in an append-only `discussion.md` with numbered turns (`## <name> — <n>`); see `templates/discussion.md`. The peer answers specific questions and writes a verdict. Nothing counts as decided until the user signs off.

## 6. Log the user's decisions
Keep a decisions log in the handoff (a date, the decision, why). Present choices as short options with a recommendation, and ask for anything that is the user's to decide rather than guessing. Pin behavior you aren't sure is wrong rather than "fixing" it.

## 7. Loop until converged
Revise the design into `design_v2.md` and so on, then re-audit only the affected cases. The design has converged when:
- the audit shows 0 regressions and 0 gaps, and no census row is left UNVERIFIED or BUG-ONLY-but-surviving;
- the peer approves;
- the user has signed off on each intentional change;
- the design adds nothing the constraints forbid (re-check each constraint explicitly at the end of the doc).

**Surface after 2 rounds.** If a step (or design) still isn't passing after 2 review/fix rounds, or you're about to run another model pilot, stop and post an update: where it stands, *why* it keeps needing rounds (wrong approach? scope too big? reviewer chasing edge cases the user doesn't care about?), and whether there's a simpler way. "Go" approves the plan, not unlimited reruns.

## 8. Handoff
Write `HANDOFF.md` so a fresh session can continue without the conversation. It covers:
- a TL;DR of where things stand;
- the design in brief;
- the constraints and rejected ideas;
- the decisions log;
- the open items;
- how to reach the peer;
- the file index.

End it with a **proposed step plan** (steps that can each be committed, with exit criteria), which is the input to `/verified-steps`. Copy the folder somewhere durable and point memory at it.

## Engine notes (Claude Code and Codex)
Install: put this folder in `~/.claude/skills/` (Claude Code) or `~/.agents/skills/` (Codex), or in `.claude/skills/` inside a repo to share it with the team.
- **Spawning a fresh agent:** in Claude Code, use the Agent tool. In Codex, use its sub-agent tool if one is available; otherwise run `codex exec --skip-git-repo-check -C <reviewer-worktree> "<brief>"`, which gets a new context, and read its final message.
- **Cross-engine review works best:** a reviewer from the *other* engine (Claude builds, Codex reviews, or the reverse) shares the fewest assumptions with the builder. If a live session from the other engine is available, prefer it as the reviewer or peer.
