---
name: explain-code
description: Explain a design, bug, review, or status to Sam so he sees the whole solution before any detail. Use whenever you present a design, a plan, a PR review, a root cause, or a status that asks him to decide, and whenever he says "what do you mean", "I'm lost", or "I don't get it". Called by design-converge. Not for one-line answers.
---

# Explain code

Sam gets lost when he never sees the whole solution, or when a term appears that he never saw defined. Show the whole first, then zoom.

**Announce it** in one line when you start a Large message: "Using explain-code: <why>". Small and Medium answers skip it.

## Pick the size first

Match the answer to the question. Too much for a simple question wastes the reader's time. Too little for a design leaves them lost, which costs more.

- **Small** (a question or a fact): 1 to 3 sentences. No map, no parts.
- **Medium** (a status, review or root cause that asks for no choice): verdict first, then one plain sentence per item, plus your pick. Add a walkthrough only if something in it is new to the reader.
- **Large** (a design, or any message that asks the user to decide): the full shape below.

If you ask the user to choose, it is Large. If the user asks "what do you mean" about a term, redo that part at Large with a real case. If unsure, go one size up.

## The 5 parts, in this order (Large)

1. **Pain.** One sentence on what goes wrong today, with a real example (real order IDs, times, numbers).
2. **Map.** The 3 to 5 pieces of the system this touches, with arrows. Name each piece once and never rename it.
3. **Walkthrough.** One real scenario traced through the map, today and after the change.
4. **Changes per piece.** For each piece: what it does now, what it does after, lines added and deleted.
5. **Your decisions.** The open choices. Each has 2 options and my pick, and points at a piece on the map.

## 3 zoom levels

- **Level 0:** the pain and the solution in two sentences.
- **Level 1:** the map and the walkthrough.
- **Level 2:** per-piece detail. Code and pseudocode only if Sam asks.

Open with Level 0 and Level 1. Go to Level 2 only after Sam confirms Level 1.

## The map is a picture

Write the map as a Mermaid file, `<name>.mmd` (in the design folder, or the wiki for a durable design). A personal mod (`mods.local/diagrams`) renders it and posts the PNG to the thread when the file is written. Do this:

- Highlight the piece under discussion with `style <id> fill:#ffe9a8`. Rewrite the file each turn to move the highlight. Unchanged text posts nothing.
- Keep it to 5 boxes or fewer, and one short label per box.
- Never Read the rendered PNG. It sits in `~/.claude/diagrams/`, which settings.json denies, and an image in context is re-sent on every request.
- If the render fails, the mod posts the error. Fix the Mermaid text.

## Term check (before every send)

List every noun Sam hasn't used himself. For each one, read what it does in the code and give one plain sentence, or swap in plain words. Words that tripped him before: "tiered", "skipped child", "first slice", "paste migration", "rebuilding pending", "old prod behavior".

## Never

- Ask for a decision before the walkthrough is shown. A bare "should I go ahead?" at the end of a status dump doesn't count.
- Claim a change is "small" without the line count. Count the lines before you send. "Not counted yet" leaves the reader unable to judge size.
- Restate an explanation that didn't land. Walk through Sam's exact scenario instead.
- Follow the rules in `/Users/sam/trading/CLAUDE.md` "Writing": verdict first, 25 words per sentence, one word per concept.
