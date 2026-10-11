#!/usr/bin/env python3
"""Print a Claude or Codex session JSONL as a readable transcript: user/assistant text plus tool-call names."""
import json, re, sys
from collections import Counter

def text(content):
    if isinstance(content, str):
        return content
    return "\n".join(c.get("text", "") for c in content or [] if c.get("type") in ("text", "input_text", "output_text"))

def rows(path):
    for line in open(path):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        p = r.get("payload") or {}
        if p.get("type") == "message" and p.get("role") in ("user", "assistant"):  # Codex
            yield p["role"], text(p.get("content"))
        elif p.get("type") in ("function_call", "custom_tool_call"):
            yield "tool", p.get("name", "?")
        elif r.get("type") in ("user", "assistant") and not r.get("isSidechain"):  # Claude
            c = r.get("message", {}).get("content")
            if isinstance(c, list):
                for b in c:
                    if b.get("type") == "tool_use":
                        yield "tool", b.get("name", "?")
            yield r["type"], text(c)

def main(path):
    tools = Counter()
    for role, t in rows(path):
        if role == "tool":
            tools[t] += 1
            continue
        t = t.strip()
        # Hydra delivers chat messages as <channel ...>text</channel>: keep the text, tagged with the sender
        m = re.match(r'<channel [^>]*user="([^"]*)"[^>]*>(.*?)(</channel>|$)', t, re.S)
        if m:
            role, t = m.group(1), m.group(2).strip()
        # skip injected instructions/reminders, keep the human and assistant words
        elif not t or t.startswith(("# AGENTS.md", "<", "Caveat:")):
            continue
        if tools:
            print(f"   [tools: {', '.join(f'{k}x{v}' for k, v in tools.items())}]")
            tools.clear()
        print(f"\n## {role.upper()}\n{t}")
    if tools:
        print(f"   [tools: {', '.join(f'{k}x{v}' for k, v in tools.items())}]")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(f"# {p}")
        main(p)
