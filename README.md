# agent-skills

Three Claude Code / Codex skills. `design-converge` and `verified-steps` work as a pair for risky changes. `retro` turns your corrections into durable rules.

1. **design-converge** - settle the design first. Case matrix from the real code, design doc with pseudocode, audit of the design against every case, a written critique from an independent peer, a log of the owner's decisions, and a loop until there are no regressions or gaps. It ends in a `HANDOFF.md` with a step plan.
2. **verified-steps** - build that plan as small committed steps. Each step is proven mechanically (suite, lint, coverage diff) and then attacked by a fresh adversarial reviewer who must prove every finding by running something, before it is committed.

3. **retro** - after a session, find where you had to correct the agent and propose the smallest edit to `CLAUDE.md`, memory or a skill that would have prevented it. A cheap model collects the pushback moments from the transcript, a strong model checks whether a rule already exists (and why it didn't fire), and nothing is applied without your approval. Includes `extract.py`, which turns a Claude Code or Codex transcript into readable text. Ask for `/retro <session>` or "retro sweep" for a weekly pass.

## Install
Copy the folders in `skills/` into `~/.claude/skills/` (Claude Code) or `~/.agents/skills/` (Codex). To share with a team, put them in `.claude/skills/` inside the repo. Then ask for them by name (`/design-converge`, `/verified-steps`) or describe the work; the descriptions make them trigger on redesigns and large or risky changes.

## Notes
- Written for a Go codebase with a money path (trading). The examples and the checks are Go-flavored (`go test -overlay`, `GOTOOLCHAIN`, `-race`). Swap in your own toolchain's equivalents.
- Both lean on spawning a fresh agent for review. In Claude Code that is the Agent tool. A reviewer from a different engine shares the fewest assumptions with the builder.
- "Surface after 2 rounds" is deliberate: if a step is not passing after two review/fix rounds, stop and report instead of rerunning.

## License
MIT. See `LICENSE`.
