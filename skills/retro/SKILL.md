---
name: retro
description: Retrospective on a Claude Code or Codex session. Finds where the user had to correct the agent, and proposes the smallest edit to CLAUDE.md (or AGENTS.md), memory, or a skill that would have prevented it, with the user's quotes as evidence. Use after a session ends, when the user says "retro <session>", or for a periodic sweep ("retro sweep"). It proposes only and never applies an edit without approval.
---

# Retro

Goal: turn the user's corrections into durable instructions, so no agent makes the same mistake twice.

## 1. Find the transcript

Given a session id or a path:
- Claude Code: `~/.claude/projects/*/<session-id>.jsonl`. List by newest: `ls -t ~/.claude/projects/*/*.jsonl | head`.
- Codex: `~/.codex/sessions/**/rollout-*.jsonl` (the largest or latest file is usually the main one).

Extract to readable text. This drops tool bodies and injected prompts, and keeps user and assistant words plus tool-call counts:
```bash
python3 <this skill's folder>/extract.py <file.jsonl> > $SCRATCH/<name>.md
```

## 2. Find the mistakes (a cheap model collects)

Don't read the transcript yourself. Spawn a **cheaper-model subagent** (for example Sonnet) to read all of it and return only the pushback moments: for each one, the user's verbatim quote, the agent turn that caused it, and about 5 lines of surrounding context. Reading is cheap work. Judging is yours. The subagent's instructions follow:

Read the whole transcript. The signal is **the user pushing back**: corrections, "why didn't you ask", frustration, repeated questions, complaints about cost or time, "stop", killing the session. Each of those marks a mistake. For each one, record:
- what the agent did, and what the user wanted instead
- a verbatim quote from the user, plus the agent turn that caused it
- the cost (usage, time, wrong work)

Skip anything the user didn't react to, unless it plainly caused harm. Don't invent findings to fill space, and don't cap the count either.

## 3. Check existing instructions (a strong model decides)

From here on, work only from the collected moments, as your strongest model (if you are not it, hand steps 3-4 to a subagent on that model). The cheap model reliably finds moments but misjudges coverage: in testing it missed an existing rule and proposed a duplicate.

For each mistake, search the instruction files the agent loaded: the project and global `CLAUDE.md` / `AGENTS.md`, the memory folder if you use one, and the installed skills.
- **Rule already exists:** work out why it didn't fire. Was it only in memory, which other engines never read? Too vague? Buried in a long paragraph? Added after the session started? Then fix *that*.
- **No rule:** propose one.

## 4. Propose

If there is no finding, say `nothing actionable` and nothing else. Otherwise write one block per finding:

```
**<one-line lesson>**
> "<the user's quote>"
What happened: <1-2 lines>
Edit: <file> — <exact text to add or change>
```

Prefer tightening an existing line over adding a new one. Propose a **new skill** only when the same multi-step workflow was improvised by hand (in this session, or in several during a sweep) and got it wrong or went slowly. Include a draft outline. Rules for every engine go in the shared instruction file. Keep each rule to one line.

## 5. Eval (when the user asks, or before a large or uncertain rule change)

Replay the prompt from just before the mistake in two fresh subagents, one with the proposed rule prepended and one without. Run each arm twice. Judge only whether the specific mistake recurs. Report it as "with rule: 0/2 repeated, without: 2/2 repeated". Keep it to that one comparison.

## Weekly sweep

Triggered as "retro sweep". Scope is the transcripts modified in the last 7 days (`find ~/.claude/projects ~/.codex/sessions -name '*.jsonl' -mtime -7`). Skip the ones with fewer than 3 messages from the user, and cap it at the 10 largest. Run one cheap collector per transcript, in parallel, then have the strong model judge them together. Look only for **patterns that show up in 2 or more sessions**, such as the same correction repeated, or the same workflow improvised by hand. That's where new skills and rules come from. Before proposing anything, read `decisions.md` next to this file if it exists, and never re-propose something the user rejected.

## Never

- Apply edits without the user's approval.
- Rerun or expand the analysis to chase more findings. One pass, then report.
