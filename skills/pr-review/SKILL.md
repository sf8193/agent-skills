---
name: pr-review
description: Adversarially review a PR or a stack of PRs and walk the user through what you found. Read the whole production diff, judge the architecture and contracts first (with a mermaid diagram), then correctness, against the team's own code rules (one owner per fact, no impossible-state code, decide then act), trace every finding to a live entry point before raising it, mutation-test the specs, post inline comments on the PR that adds each line, then sort the author's replies and own the points you got wrong. Use when asked to review, adversarially review, or "lmk what you find" on a PR, a stack, or a branch, and for re-reviews after the author replies. Not for building (use verified-steps) or designing (use design-converge).
---

# PR review

Read-only on the code under review. Findings are guesses until traced. A wrong finding costs the author one reply; a missed defect costs an incident. Say what you checked and what you did not.

**Announce it** in one line: "Using pr-review: <PR or stack>".

## 1. Orient

- Find the stack order: for each PR, `gh pr view <n> --json baseRefName,headRefName,headRefOid,files`. A PR whose base is another PR's head is stacked on it. Review at the top head. A PR based on `main` is a stack of one; skip the rest of this bullet.
- If the PRs are already merged, review the merge range (`git merge-base <bottom head> origin/main`..top head), call the findings follow-ups, and skip §6.
- Review in a detached worktree at the top head (`git worktree add --detach <worktree dir>/<repo>-review-<pr> <headRefOid>`), never in a shared checkout. Use the worktree directory the user's CLAUDE.md names. Fetch before you read; shared checkouts are stale.
- Read the repo's own review rules first (`REVIEW.md`, `CLAUDE.md`, `AGENTS.md`, a repo review skill or command) and the project's decisions doc. Do not reopen anything decided there. Apply the rules below on top. If the repo's rules define finding strengths or list what CI already blocks, use theirs in place of §4's strengths, and spend no findings on what CI blocks.
- Read the PR title and description before the diff. Check the diff does what they say: leftovers of a removal, behaviour the description omits, claims (a flag, a test, a migration) the diff lacks.

## 2. Read the whole production diff, then the specs

- Read every production file in the stack before judging any line. The same fact is often decided in several places; you only see that with the whole diff.
- Map where each changed (not new) function or accessor is called (`grep -rn`), and count call sites. A changed meaning with many unchanged callers is an integration finding.
- Read specs second, to see what the author thinks the behaviour is.

## 2b. Size the review

Count production lines only (`git diff --numstat`, leaving out specs, generated files, schemas, lockfiles). The sizes come from three runs: 100 lines read in full alone, 1,087 lines where one reader covered about two thirds, and about 1,900 across 12 PRs where one reader covered 40%.

| Size | Production lines | How |
|---|---|---|
| Small | under 300 | Work alone. |
| Medium | 300 to 1,000 | Work alone, then give each Raise or Block finding to a fresh verifier. |
| Large | over 1,000 | Split, as below. |

**Large:** you keep orient, the diagram (Pass A needs the whole diff) and the report. Give each slice of about 800 production lines (a group of PRs or files that belong together) to one reader subagent that applies every lens to its slice, not one lens to the whole diff. Each reader returns findings with the trace, its cleared candidates, and the files it did not read. Run the §5 spec review and mutation pass as one more agent, only after the user agrees.

**Verifier (medium and large):** one fresh agent per Raise or Block finding. Give it the question and the code, never your claim: an anchored reviewer confirms a wrong claim. Notes skip it. Drop or downgrade any finding it cannot reproduce.

If you cannot read every production file at the size you are in, say so in §7 and ask before reporting a partial review as the review.

## 3. Architecture first, then correctness

Judge the design before the lines. A correct line in the wrong place or behind a weak contract is still a finding, and it makes later line findings moot.

The user's own code rules (the Code Rules and Process Rules in their CLAUDE.md, AGENTS.md or GEMINI.md, whichever the agent does not load by itself: read it explicitly) are the standard. Read them and review against each one. The lenses below are the minimum, not a replacement.

Raise only the lenses that produce a finding, with file and line; do not list empty ones. For a diff with no production code (a doc, a prompt, a skill), only the contracts lens, the cold read and the deletion pass apply; say the rest were skipped.

**Pass A: architecture and contracts (lenses 1-2).** Before any finding, draw the changed flow as one mermaid diagram (load `explain-code`): the entry point, each new or changed unit, which unit owns each fact, and where the layer boundaries sit. Draw from the code you read, not from the PR description. Then judge:

1. **Contracts.** For each new or changed public signature, class or type: is the interface the smallest that works? Does the type make the wrong call impossible (one constructor, the object instead of an id, a distinct type per kind, no flag arguments)? Does the signature tell the truth about what can fail or be nil? Does it sit at the right layer, with data apart from behaviour? **Data shape:** for each new column, field or record, would a different shape remove a check, a flag or a sync step? Name the states the shape allows that the business forbids (two flags that can disagree, a nullable that is always set, a status plus a timestamp that must match). Propose the shape where those states cannot be stored. Say what the ideal contract is, not only what is wrong.
2. **The user's code rules.** For each rule in their code rules, find the added code that breaks it, and name the rule. Their rules are the Code Rules in their CLAUDE.md or AGENTS.md; if they have none, use `rules/code-rules.md` in the agent-skills repo this skill ships in (`../../rules/code-rules.md` from this folder). A gauge that can stop emitting also needs a no-data alert.

**Pass A also reads the code as a stranger would.**

- **Cold read.** Read the diff once without the PR description. Each place you had to stop and ask "what is this?" is a finding: a name that does not say what the thing is, a function that does two jobs, a bare number or string whose meaning is not named (a magic number wants a named constant).
- **Deletion pass.** For each added line, ask what breaks if it is removed. If nothing, name it: an unused parameter, a speculative branch, a spec that repeats another. Compare the diff size to a one-line description of the feature.

**Pass B: correctness (lenses 3-6).** Only after Pass A. Trace on the design as it stands; if Pass A found a design that should change, say so and trace lightly.

3. **Money and state.** Amounts, balances, ledger entries, state transitions: trace the external result against the local commit against the retry path. Review these as if nothing else is in the diff. Trace one real case with actual numbers end to end (a balance of 100 with 40 pending); double subtraction and unit mismatches only show up with values.
4. **Concurrency.** For each lock or recheck, name the two actors that can interleave and what schedules them. A race with no second actor is not a finding; one with a second actor is.
5. **Failure modes.** Run the `error-census` skill on the diff: every way it can fail, which ones outside input can really cause, and what the operator sees and can safely rerun.
6. **Integration.** What other services, events, clients or runbooks see this change? List what you could not verify from the repo as questions.

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

## Other agents

- **Loading a named skill** (`explain-code`, `error-census`): in Claude Code use the Skill tool; elsewhere read that skill's `SKILL.md` and follow it.
- **Subagents** (§2b): Claude Code Agent tool; agy `invoke_subagent` (`self` for anything that runs tests or `gh`, `research` for read-only readers); Codex its sub-agent tool, else `codex exec` in the worktree. With none, work alone and say the verifier step was skipped.
- **Rules files:** agy loads `AGENTS.md` and `GEMINI.md` but not `CLAUDE.md`; Claude Code the reverse. Read the other one by hand.
