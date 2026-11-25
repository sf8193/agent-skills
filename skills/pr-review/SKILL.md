---
name: pr-review
description: Adversarially review a PR or a stack of PRs and walk the user through what you found. Read the whole production diff, check it against the team's rules (one owner per fact, no impossible-state code, decide then act), trace every finding to a live entry point before raising it, mutation-test the specs, post inline comments on the PR that adds each line, then sort the author's replies and own the points you got wrong. Use when asked to review, adversarially review, or "lmk what you find" on a PR, a stack, or a branch, and for re-reviews after the author replies. Not for building (use verified-steps) or designing (use design-converge).
---

# PR review

Read-only on the code under review. Findings are guesses until traced. A wrong finding costs the author one reply; a missed defect costs an incident. Say what you checked and what you did not.

**Announce it** in one line: "Using pr-review: <PR or stack>".

## 1. Orient

- Find the stack order: for each PR, `gh pr view <n> --json baseRefName,headRefName,headRefOid,files`. A PR whose base is another PR's head is stacked on it. Review at the top head. A PR based on `main` is a stack of one; skip the rest of this bullet.
- Review in a detached worktree at the top head (`git worktree add --detach <worktree dir>/<repo>-review-<pr> <headRefOid>`), never in a shared checkout. Use the worktree directory the user's CLAUDE.md names. Fetch before you read; shared checkouts are stale.
- Read the repo's own review rules first (`REVIEW.md`, `CLAUDE.md`, `AGENTS.md`, a repo review skill or command) and the project's decisions doc. Do not reopen anything decided there. Apply the rules below on top. If the repo's rules define finding strengths or list what CI already blocks, use theirs in place of §4's strengths, and spend no findings on what CI blocks.
- Read the PR title and description before the diff. Check the diff does what they say: leftovers of a removal, behaviour the description omits, claims (a flag, a test, a migration) the diff lacks.
- Say a one-line stakes statement: what a wrong swap, balance or state change costs here.

## 2. Read the whole production diff, then the specs

- Read every production file in the stack before judging any line. The same fact is often decided in several places; you only see that with the whole diff.
- Map where each changed (not new) function or accessor is called (`grep -rn`), and count call sites. A changed meaning with many unchanged callers is an integration finding.
- Read specs second, to see what the author thinks the behaviour is.

## 3. Architecture first, then correctness

Judge the design before the lines. A correct line in the wrong place or behind a weak contract is still a finding, and it makes later line findings moot.

The user's own code rules (the Code Rules and Process Rules in their CLAUDE.md) are the standard. Read them and review against each one. The lenses below are the minimum, not a replacement.

Raise only the lenses that produce a finding, with file and line; do not list empty ones.

**Pass A: architecture and contracts (lenses 1-5).** Before any finding, draw the changed flow as one mermaid diagram (load `explain-code`): the entry point, each new or changed unit, which unit owns each fact, and where the layer boundaries sit. Draw from the code you read, not from the PR description. Then judge:

0. **Contracts.** For each new or changed public signature, class or type: is the interface the smallest that works? Does the type make the wrong call impossible (one constructor, the object instead of an id, a distinct type per kind, no flag arguments)? Does the signature tell the truth about what can fail or be nil? Does it sit at the right layer, with data apart from behaviour? Say what the ideal contract is, not only what is wrong.
1. **One owner per fact.** Anything derived in two places, any copy kept in sync (a column that mirrors another, an id matched by string, the same query written twice). Name the owner it should have.
2. **No impossible-state code.** A guard, nil check, raise, rescue, retry or else-branch needs a traced outside-input path or a real concurrent writer. If only our own code reaches it, the fix is to make the case unrepresentable (hold the object, not an id; pass the value in), not to guard it. A guard that exists only to narrow a type is this finding. A spec that asserts the impossible state belongs to the same finding.
3. **Decide, then act.** A flow that interleaves checks with actions and rechecks the same preconditions at each step wants a pure function returning an action and one dispatcher.
4. **Third-party quirks stay in the adapter.** Generic code that names a provider or matches its strings.
5. **Alerts.** A page or error-level report for something a human cannot act on yet (an expected wait, a self-healing failure) is noise. A gauge that can stop emitting needs no-data to alert.
**Pass B: correctness (lenses 6-8).** Only after Pass A. Trace on the design as it stands; if Pass A found a design that should change, say so and trace lightly.

6. **Money and state.** Amounts, balances, ledger entries, state transitions: trace the external result against the local commit against the retry path. Review these as if nothing else is in the diff.
7. **Concurrency.** For each lock or recheck, name the two actors that can interleave and what schedules them. A race with no second actor is not a finding; one with a second actor is.
8. **Integration.** What other services, events, clients or runbooks see this change? List what you could not verify from the repo as questions.

## 4. Prove each finding before raising it

- Trace a call from a live entry point, or find a second independent signal. A grep hit, a type or a comment is not proof.
- Trace read paths as well as write paths. State what your evidence covers: a "never" is only as strong as the data behind it. Label anything not proven `unverified`.
- Before "X is missing", run the search and keep the empty output.
- Keep a short list of candidates you cleared, each with the code that cleared it (for example, the balance query that already subtracts the pending transfer). Report it in §7.
- Say how the state would have to arise. "This can't happen" and "this can happen" both need the path.
- For each finding state three things: did the author show awareness, what happens if it fires in production, how often. Aware, low risk and rare: drop it. High risk keeps it. Unclear: raise it as a question.
- Give each finding a strength: **Block** (silent, touches money or state, or already caused an incident; quote the line and the concrete input), **Raise** (unproven from the diff; say what you checked and what would settle it), **Note** (naming, duplication, grouped once).

## 5. Review the specs

- Does each spec guard a realistic regression? Flag specs of constants, trivial round trips, private helpers, or one rule once per branch.
- **Mutation pass.** Spend compute only after the user agrees. In the worktree, set up the test stack, then for each guard line change its condition to `if false`, run the related specs, record which examples fail, and restore the file. Keep the harness and results in the scratchpad, not the repo. Read the result this way:
  - Guard survived: unreachable code, or an untested rule.
  - Examples that fail only alongside others and never alone: candidates to merge or table-drive.
  - Impossible-state code that has its own spec survives, because the spec asserts the impossible case; find those by tracing, not by mutation.
  - Examples no break killed are mostly happy paths. That is not proof they are redundant; say so.
- Name the gaps: the finding no spec would catch.
- When done, tear the worktree's databases and containers down.

## 6. Post comments

Posting under the user's account needs their word for that PR, unless they already said to leave comments.

- One review per PR, with inline comments anchored to the PR whose diff adds the line, at that PR's head commit (`commit_id`), `side: RIGHT`. In a stack the same file appears in several PRs; use the one that adds the line.
- Check each line is inside the PR's diff hunks first. An out-of-diff line fails the whole review with a 422; move that comment to the PR that adds it.
- Each comment: the claim, the example with real values, the fix. Name the rule. Keep nits grouped.
- Watch every PR (`watch_pr`). The watcher echoes your own comments back; ignore those.

## 7. Report to the user

- Line 1 is the verdict. Then the mermaid diagram from Pass A. Then one real example. Then the decisions, each naming its object.
- Add one line per cleared candidate from §4, so the user sees it was checked.
- Say what you covered and what you did not (PRs not read, specs not read, mutation only on one file).
- Mark unverified items. Do not pass off a bot's or author's claim as checked.
- Plain words. Define any code name or label the user has not used.

## 8. When the author replies

- Sort every reply: real bugs, valid suggestions, noise, nits. Lead with what needs action.
- Check the author's counter-claims in the code before accepting or rejecting them. If they are right, say so plainly and withdraw the point. If you were wrong, say what you got wrong.
- Push back only with a rule and a trace. Do not repeat a point that did not land; walk their exact case.
- Bot findings (Cursor, Bugbot) get the same proof as yours. Say whether the bot or the author is right and why.
- Re-reviews: do not re-run every lane. Check the earlier findings against the new commits and read only the changed lines.

## 9. Clean up

Remove the review worktree and its databases and containers when the user says they are done.
