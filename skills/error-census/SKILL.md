---
name: error-census
description: Find every way the code under review can fail or be built wrong, trace which ones outside input can really cause, and remove the rest by construction when the removal is worth its cost. Three questions - what can go wrong, where does it come from, is removing it worth it. Use it on a design (called from design-converge section 2b), on a diff (called by the verified-steps reviewer and the PR review), or on its own against an existing package as a cleanup audit. Use it whenever code adds, keeps or removes an error return, guard, nil check, retry, page, exported error, or a struct of required dependencies or config. Not for mechanical renames.
---

# Error census

The rule: if only our own code can cause a failure, do not return, wrap or page it. Remove the way to ask for the wrong thing. This skill is the one place that rule is turned into steps. `design-converge`, the `verified-steps` reviewer brief and your PR review command can all call it, so they cannot drift apart.

**Announce it.** Tell the user in one line, e.g. "Using error-census: <what it is run on>".

## 1. What can go wrong? (list)
For the code under review, list each of these with file:line:
- an error return, an exported error, a wrapped or paged error;
- a guard, nil check, fallback, retry;
- a struct literal that can leave a field out (a struct of required dependencies or config), and a zero value that is usable by accident;
- a place that takes an ID, a string or a flag where it could hold the object or a typed value.
Search for them, do not rely on memory: grep `errors.New`, `fmt.Errorf`, `== nil`, `if err`, struct literals of dependency or config types, and read the constructors. A claim that something is missing needs the search command and its empty output.

## 2. Where does it come from? (trace)
For each row write the path from an outside entry point to the site, with the value the outside caller passes: entry point → … → site (file:line). Outside means the market, Schwab or another broker, config, stored data, a user request.
- **REAL:** a traced outside path exists.
- **BUG-ONLY:** no such path, only our own code can cause it. "A restart or a stream gap that our code mishandles" is BUG-ONLY.
- **UNVERIFIED:** not traced yet. It counts as REAL until traced or the user rules; a ruling is logged with its date.

## 3. Can we remove it, and is it worth it? (mitigate and judge)
- **REAL:** it stays an error, handled in one place.
- **BUG-ONLY:** remove it by construction, not with a guard. Pick one per row:
  - one constructor where every argument is required, with unexported fields (a forgotten field is a compile error, not a nil);
  - take no input that could be wrong;
  - hold the object instead of an ID;
  - give each kind its own type;
  - keep the error unexported, and not branched on in-package (that has not removed it).
  - if none of those is worth its cost, take the cheapest removal: delete the error return and its check. A violation then fails loudly where it happens (a nil call panics at the site) instead of being handled. Deleting is always an option, so a BUG-ONLY error is never kept just because the constructor-style fix is expensive.
- The only runtime guard allowed is one generic report-and-continue guard that logs, pages once and returns nothing, and only to avoid a panic. Name the panic it covers.

Then ask: **will this make the code better and stronger?** For every proposed removal state the net cost: lines, call sites touched, new types or interfaces, and the failure class it deletes. Reject a form of removal that costs more than it saves, say so in the table, and move to the next cheaper form (down to deleting the check). Example: a constructor argument added to remove one nil check, which touches ~100 call sites, fails the gate, so delete the check and its test instead; a ~40-line constructor that makes a forgotten dependency a compile error, removing a crash on startup, passes. The user rules on close calls; do not let scope grow for impossible cases.

## 4. Output
One table, one row per item: `site | kind | outside path | REAL / BUG-ONLY / UNVERIFIED | mitigation | net cost | decision (remove: <form> / keep (REAL only))`. A BUG-ONLY row with decision "keep" is a defect unless the user ruled to keep it, with the date. UNVERIFIED rows block approval.

## Audit mode (existing code)
Run it on a package the user names, not on a diff. Rank BUG-ONLY rows by the failure class they would delete (a process crash or a wrong-sized order first, a log line last). Each accepted removal becomes one `verified-steps` step; do not bundle them. Start with the packages that hold the most error handling.

## Mechanical help (it does not replace tracing)
- `golangci-lint run --enable-only=unparam` finds results that are never used, and error returns that are always nil.
- `exhaustruct`, scoped to named dependency types, rejects a literal that omits a field.
- A linter cannot tell whether a non-nil error can be reached from outside input. That needs step 2.
