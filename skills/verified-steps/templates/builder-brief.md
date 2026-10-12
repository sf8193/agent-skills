# Step <n> builder brief: <title>

Worktree: <path> (branch <branch>, HEAD <sha>). Don't commit; the orchestrator commits.
Scope: EDIT ONLY <packages/files>. Other builders are editing <other scopes> in the same worktree at the same time.
Allowed: <tests only | prod in X>. Not allowed: <prod changes, testdata, other sessions' resources, the dev DB>.

## Approved plan (verbatim from the user-approved plan; do not deviate, report any needed change instead of making it)
<paste the step text>

## Do
<exact items, taken from the plan or report, with file:line where known>

## Rules
- Run only your own packages (`go test ./<pkg> -count=1 -race`), never `./...`.
- For experiments on prod code, use `go test -overlay`. Never edit prod files in this worktree.
- If a correct test FAILS on the current code, you've found a real bug. Don't change prod code and don't weaken the assertion. Report the bug with its input, expected value, actual value, and file:line.
- Skip anything marked for another step or for the user to decide.

## Proof required
<e.g. for each merge, a mutation the original tests caught that the merged test still catches; for each strengthened test, a mutation that now fails it>
Finish with `go vet` and the package tests green.

## Return (≤250 words)
A "Plan vs actual" table first: one row per planned item, marked done / changed / dropped, with the reason. A blank table counts as a miss.
A "Tests added" table: for each new test, the requirement it guards and the mutation that fails it. No failing mutation means don't add it; list it as "needs user OK" instead.
Then what you did, item by item: done, bug found, or skipped (and why). Include the mutation evidence and `git diff --stat` for your scope.
