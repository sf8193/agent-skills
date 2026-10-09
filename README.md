# design-converge + verified-steps

Two Claude Code / Codex skills that work as a pair for risky changes.

1. **design-converge** - settle the design first. Case matrix from the real code, design doc with pseudocode, audit of the design against every case, a written critique from an independent peer, a log of the owner's decisions, and a loop until there are no regressions or gaps. It ends in a `HANDOFF.md` with a step plan.
2. **verified-steps** - build that plan as small committed steps. Each step is proven mechanically (suite, lint, coverage diff) and then attacked by a fresh adversarial reviewer who must prove every finding by running something, before it is committed.

## Install
Copy the two folders in `skills/` into `~/.claude/skills/` (Claude Code) or `~/.agents/skills/` (Codex). To share with a team, put them in `.claude/skills/` inside the repo. Then ask for them by name (`/design-converge`, `/verified-steps`) or describe the work; the descriptions make them trigger on redesigns and large or risky changes.

## Notes
- Written for a Go codebase with a money path (trading). The examples and the checks are Go-flavored (`go test -overlay`, `GOTOOLCHAIN`, `-race`). Swap in your own toolchain's equivalents.
- Both lean on spawning a fresh agent for review. In Claude Code that is the Agent tool. A reviewer from a different engine shares the fewest assumptions with the builder.
- "Surface after 2 rounds" is deliberate: if a step is not passing after two review/fix rounds, stop and report instead of rerunning.

## License
MIT. See `LICENSE`.
