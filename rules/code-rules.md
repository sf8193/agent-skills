# Code rules

General rules for writing and reviewing code. Agents read this file when building; the `pr-review` skill checks every change against it.

- **One owner per fact.** Keep each fact (an amount, a status, a per-record value) in exactly one place and read it from there. Don't add a second copy kept in sync by scaling or mirroring code. When reading, ask only the owner of the fact, never re-derive it in the caller. That way you ask at the right layer, and the owner's logic for where the value comes from lives in one place.
- **Make errors unrepresentable; push as much as you can into compile time (Sorbet, TypeScript strict).** If only our own code can cause a failure, don't return, wrap or page it: remove the way to ask for the wrong thing. Build values through one constructor, hold the object instead of an ID, give each kind its own type, and keep bug-only errors private. A new public error needs a traced path from outside input (a bank, a provider, config or stored data). A method either answers or changes state; a getter never picks a record by guessing or raises to steer the flow.
- **Total functions; validate as high up the stack as possible, at the top of the function.** Check outside input at the entry (controller, handler, mutation), or as soon after as you can, and check the rest on a function's first lines, so inner code trusts what it gets. Each function answers every input it can receive. One bad record must not abort a loop over many.
- **One hop to understand.** A reader grasps a function without opening three others: no long association chains, no state set far from where it is read, names that say what the code does.
- **Safe to run twice.** Every job, task and migration step is idempotent, can preview with a dry run, and says in its logs what it did and how to undo it.
- **Deep modules: small interface, hidden work.** Callers say what happened or ask one question; the module owns the steps, the rules and the state it decides from, and keeps that state stored. A caller never re-derives it or needs to know the order of calls.
- **Decide, then act.** New logic is a pure function that returns an action; one dispatcher is the only code that performs it. A new case adds an action, not a branch through several layers.
- **Third-party quirks stay in the integration adapter.** Generic code must not match a provider's text, status strings or ID rules. The adapter translates them into typed errors and states first.
- **Separate data and behavior.** Keep state in data structures and logic in functions.
- **Prefer strong types and named constants over primitives.**
- **Page a human only for what a human must act on.** A failure that often resolves itself gets a warning log, and an alert only after it fails N times in a row.
- **Write the fewest specs that catch a realistic regression.** Don't test constants, trivial round trips, private helpers, or the same rule once per surface. Each spec states the regression it guards.
- **Don't let a slow or failing side call stall a live decision.** Persistence is for recovery and audit; don't make it a read path the hot path blocks on.
