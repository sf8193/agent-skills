# agent-skills

Eight Claude Code / Codex skills and two Claude Code mods. `design-converge` and `verified-steps` work as a pair for risky changes, and both call `error-census`. `overnight-steps` runs a user-supplied list unattended through `verified-steps`. `retro` turns your corrections into durable rules. `pr-review` reviews a PR or a stack.

1. **design-converge** - settle the design first. Case matrix from the real code, design doc with pseudocode, audit of the design against every case, a written critique from an independent peer, a log of the owner's decisions, and a loop until there are no regressions or gaps. It ends in a `HANDOFF.md` with a step plan.
2. **verified-steps** - build that plan as small committed steps. Each step is proven mechanically (suite, lint, coverage diff) and then attacked by a fresh adversarial reviewer who must prove every finding by running something, before it is committed.
3. **overnight-steps** - run a user-supplied list of product or code tasks unattended through `verified-steps`. When unsure on design or scope, orient to the repo's invariants, pick the best long-term solution, log the choice in `DECISIONS.md`, and keep going; end with an ordered PR stack, decision bullets, and an honest invariant audit.
4. **error-census** - find every way the code can fail or be built wrong (error returns, guards, nil checks, retries, struct literals that can omit a field), trace which ones outside input can really cause, and remove the rest by construction when the removal is worth its cost. Called by `design-converge` and the `verified-steps` reviewer, or run on its own against a package as a cleanup audit.
5. **retro** (tuned for Hydra sessions; edit the lookup and paths for your setup) - after a session, find where you had to correct the agent and propose the smallest edit to `CLAUDE.md`, memory or a skill that would have prevented it. A cheap model collects the pushback moments from the transcript, a strong model checks whether a rule already exists (and why it didn't fire), and nothing is applied without your approval. Includes `extract.py`, which turns a Claude Code or Codex transcript into readable text. Ask for `/retro <session>` or "retro sweep" for a weekly pass.
6. **explain-code** - show the whole solution before any detail. Pain, a map of 3 to 5 pieces, one real walkthrough, changes per piece, then the decisions. A term check defines every noun the reader hasn't used. `design-converge` calls it.
7. **project-pm** - act as project manager for a multi-session engineering project: order work in the project's tracker, verify worker reports against the project's rollout ladder, and spot blocked workers.
8. **pr-review** - adversarially review a PR or a stack. Read the whole production diff, draw the flow as a mermaid diagram, judge architecture and contracts before correctness against the team's code rules (one owner per fact, no impossible-state code, decide then act), prove every finding from a live entry point, mutation-test the specs, post inline comments on the PR that adds each line, then sort the author's replies and own what you got wrong.

## Rules
`rules/code-rules.md` holds the general code rules the skills check against (one owner per fact, total functions, deep modules, safe to run twice). Load it from your agent's rules file: Claude Code with an `@` include in `CLAUDE.md`; agy with a symlink at `~/.gemini/config/AGENTS.md`, since agy does not expand `@path`. `pr-review` reads it when the user has no code rules of their own.

## Mods
Claude Code mods (v2.1.287+), in `mods/`. Load one with `claude --plugin-dir mods/<name>`.

- **diagrams** - when a session writes or edits a `*.mmd` file, renders it with `mmdc` (`npm i -g @mermaid-js/mermaid-cli`) and posts the PNG to the Discord thread of the session's last message. Needs the Discord plugin. PNGs go to `~/.claude/diagrams/`; add `"permissions": {"deny": ["Read(~/.claude/diagrams/**)"]}` to `settings.json` so a rendered image can't be read into context, where it is re-sent on every request.
- **guards** - refuses Bash commands behind past incidents (`gt sync`, `git stash`, `tmux kill` without `-S`, a piped test run committed in the same command). Edit `guards.ts` for your own rules.

## Install
Clone the repo, then run `./install.sh`. It symlinks every skill into Claude Code (`~/.claude/skills`), Codex (`~/.agents/skills`) and agy (`~/.gemini/config/skills`), links the shared code rules for agy, and prints the one line to add to your `CLAUDE.md` so Claude Code loads the rules. It is safe to rerun and never overwrites a real file or folder. To share with a team instead, put the folders in `.claude/skills/` inside the repo. Then ask for the skills by name (`/design-converge`, `/verified-steps`) or describe the work; the descriptions make them trigger on redesigns and large or risky changes.

## Notes
- Written for a Go codebase with a money path (trading). The examples and the checks are Go-flavored (`go test -overlay`, `GOTOOLCHAIN`, `-race`). Swap in your own toolchain's equivalents.
- Both lean on spawning a fresh agent for review. In Claude Code that is the Agent tool. A reviewer from a different engine shares the fewest assumptions with the builder.
- "Surface after 2 rounds" is deliberate: if a step is not passing after two review/fix rounds, stop and report instead of rerunning.

## License
MIT. See `LICENSE`.
