#!/usr/bin/env bash
# Links every skill in skills/ into Claude Code, Codex and agy, and the shared code rules into agy.
# Safe to rerun: it replaces only symlinks, and skips (with a warning) anything that is a real file or folder.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"

link() { # link <target> <destination>
  local target="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "skip $dest (exists and is not a symlink)"
    return
  fi
  ln -sfn "$target" "$dest"
  echo "link $dest -> $target"
}

for skill in "$REPO"/skills/*/; do
  name="$(basename "$skill")"
  link "$REPO/skills/$name" "$HOME/.agents/skills/$name"            # Codex
  link "../../.agents/skills/$name" "$HOME/.claude/skills/$name"    # Claude Code
  link "$REPO/skills/$name" "$HOME/.gemini/config/skills/$name"     # agy
done

# agy does not expand Claude's @include, so it loads the rules as its global rules file.
link "$REPO/rules/code-rules.md" "$HOME/.gemini/config/AGENTS.md"

cat <<EOF

One manual step for Claude Code: in your CLAUDE.md, under "Code Rules", add this line so the rules load:

@$REPO/rules/code-rules.md
EOF
