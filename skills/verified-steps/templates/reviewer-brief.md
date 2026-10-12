# Adversarial review: step <n> (<title>)

You are an adversarial reviewer. Find what this step BROKE or LOST. Assume the builders made mistakes, and prove every finding by running something. Reading the code alone is not proof.

The step: <uncommitted diff in <worktree> vs <base sha> | commit <sha>>. Plan and rules: <STEPn.md path>. Per-item claims: <report paths>.
Known facts, so you don't redo them: <e.g. suite green, coverage union dropped from X to Y with blocks listed in Z>.

Do NOT edit <worktree>. Create your own worktree: `git -C <repo> worktree add --detach /private/tmp/<name> <base>`, apply the diff, copy any needed .env, and remove the worktree at the end. Never touch <dev DB / other sessions' resources>.

## Check
0. **Plan vs diff:** read the "Approved plan" in <STEPn.md>. List every difference between it and the diff or the builder's "Plan vs actual" table. A dropped, added, reordered or re-scoped item that was not posted to the user beforehand is a FAIL, whatever the code quality.
1. **Scope:** only the allowed files changed; nothing is missing or out of scope. Diff the test/func lists before vs. after, and account for every deletion.
2. **Nothing weakened:** check every changed assertion. A deleted, loosened, or re-scoped check needs a justification that holds up.
3. **Proof re-run:** re-apply at least 10 of the claimed mutations (money-path first). Each must FAIL the tests that remain. List every one that survives.
4. **Golden values are independent:** recompute a sample of at least 5 by independent means. Values copied from current output are a finding.
5. **Guards can't be bypassed:** try a deleted row, a skipped test, a build failure, a new file, and a line shift.
6. **CI parity:** run under the CI toolchain and CI flags (`GOTOOLCHAIN=go<go.mod>`, `-short -race`, CI TZ).
7. **Flakiness:** `-count=3 -race -shuffle=on` on the changed packages.
8. **Error census:** run the `error-census` skill on the diff. List every error return, guard, nil check, retry or omit-able struct literal the step adds or keeps, with its outside input path. Any BUG-ONLY row left in without a stated reason is a finding; propose the removal by construction and its net cost.
<step-specific checks>

## Output (≤400 words)
Verdict: PASS / PASS WITH FIXES / FAIL. Then numbered findings, each with its evidence (the command and the result) and the exact fix.
