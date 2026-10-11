---
name: retro
description: Retrospective on a Hydra/Claude/Codex session. Finds where Sam had to correct the agent, and proposes the smallest edit to CLAUDE.md, memory, or a skill that would have prevented it, with his quotes as evidence. Use after a session is killed, when Sam says "retro <name>", or for a periodic sweep. It proposes only and never applies an edit without approval.
---

# Retro

Goal: turn Sam's corrections into durable instructions, so no agent (Claude or Codex) makes the same mistake twice.

## 1. Find the transcript

Given a Hydra session name (e.g. `glyph`) or session id:
- Codex: `~/.codex/hydra-<name>/sessions/**/rollout-*.jsonl` (the largest or latest file is usually the main one)
- Claude: `~/.claude/projects/*/<session-id>.jsonl`. Map name → id with `~/.claude/channels/discord/sessions.json` (`tmuxName`, `sessionId`), or `grep -l <thread-id>`.

Extract to readable text (this drops tool bodies and injected prompts, and keeps user and assistant words plus tool-call counts):
```bash
python3 ~/.agents/skills/retro/extract.py <file.jsonl> > $SCRATCH/<name>.md
```

## 2. Find the mistakes (Sonnet collects)

Don't read the transcript yourself. Spawn a **Sonnet subagent** to read all of it and return only the pushback moments: for each one, Sam's verbatim quote, the agent turn that caused it, and ~5 lines of surrounding context. Reading is cheap work, and judging is yours. The subagent's instructions follow:

Read the whole transcript. The signal is **Sam pushing back**: corrections, "why didn't you ask", frustration, repeated questions ("what's going on", "peek"), usage complaints, "kill". Each of those marks a mistake. For each one, record:
- what the agent did, and what Sam wanted instead
- a verbatim quote from Sam, plus the agent turn that caused it
- the cost (usage, time, wrong work)

Skip anything Sam didn't react to, unless it plainly caused harm. Don't invent findings to fill space, and don't cap the count either.

## 3. Check existing instructions (you decide)

From here on, work only from the collected moments, as Opus (if you are not Opus, hand steps 3-4 to an Opus subagent). Sonnet reliably finds the moments but misjudges coverage: in testing it missed an existing CLAUDE.md rule and proposed a duplicate.

For each mistake, grep `~/trading/CLAUDE.md` (Codex reads it via the `AGENTS.md` symlink), `~/.claude/projects/-Users-sam-trading/memory/`, and `~/.claude/skills/`.
- **Rule already exists:** work out why it didn't fire. Was it memory-only, which Codex never sees? Too vague? Buried? Then fix *that*.
- **No rule:** propose one.

## 4. Propose

If there is no finding, post exactly `nothing actionable` and nothing else (Sam kills the session to finish it; no summary, no explanation of the kill). Otherwise post to Sam's chat (main channel, or the thread that asked), one block per finding:

```
**<one-line lesson>**
> "<Sam's quote>"
What happened: <1-2 lines>
Edit: <file> — <exact text to add/change>
```

Prefer tightening an existing line over adding a new one. Propose a **new skill** only when the same multi-step workflow was improvised by hand (in this session, or in several during a sweep) and got it wrong or went slowly. Include a draft SKILL.md outline. Rules that apply to both Claude and Codex go in `~/trading/CLAUDE.md`. Keep each rule to one line.

## 5. Eval (when Sam asks, or before a large or uncertain rule change)

Replay the prompt from just before the mistake in two fresh subagents, one with the proposed rule prepended and one without. Run each arm 2x. Judge only whether the specific mistake recurs. Report the results as "with rule: 0/2 repeated, without: 2/2 repeated". Keep it to that one comparison. For a new skill, or a big skill rewrite, use skill-creator's eval loop instead: the failing moment becomes its test case, and the old skill is the baseline.

## Weekly sweep

Triggered as "retro sweep". Scope is the transcripts modified in the last 7 days (`find ~/.claude/projects ~/.codex/hydra-*/sessions -name '*.jsonl' -mtime -7`). Skip the ones with fewer than 3 messages from Sam, and cap it at the 10 largest. Run one Sonnet collector per transcript, in parallel, then have Opus judge them together. Look only for **patterns that show up in 2 or more sessions**, for example the same correction repeated, or the same workflow improvised by hand. That's where new skills and rules come from. Leave single-session mistakes out, since the on-kill retros already cover them. Before proposing anything, read `~/.agents/skills/retro/decisions.md` if it exists, and never re-propose something Sam rejected.

## Never

- Apply edits without Sam's 👍.
- Rerun or expand the analysis to chase more findings. One pass, then report.
