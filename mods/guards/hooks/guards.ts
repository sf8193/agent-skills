// Commands that caused real incidents in hydra sessions. Each refusal names the
// incident so the model knows why and what to do instead. The guard reads the
// command text: it stops honest mistakes, not a determined workaround.

// The commands in one shell line: split at ; && || | and newlines.
const commands = (line: string) => line.split(/;|&&|\|\||\||\n/)
// Where a command starts: optional "(" and VAR=value prefixes, so `rg "gt sync"` is not a gt sync.
const START = String.raw`^[\s(]*(?:\w+=\S*\s+)*`
// git with any leading options (-C dir, -c key=val, --no-pager).
const GIT = String.raw`git\s+(?:-[cC]\s+\S+\s+|--\S+\s+)*`

const GT_SYNC = new RegExp(START + String.raw`gt\s+(?:repo\s+)?sync\b`)
const TMUX_KILL = new RegExp(START + String.raw`tmux\b.*\bkill-(?:server|session)\b`)
const STASH = new RegExp(START + GIT + String.raw`stash\b\s*(\S*)`)
const TEST_RUN = String.raw`\b(?:bun\s+(?:run\s+)?test|go\s+test|pytest|cargo\s+test|vitest|jest|(?:npm|pnpm|yarn)\s+(?:run\s+)?test|(?:make|just)\s+test|scripts/test\.sh)\b`
// A test run whose output is piped (redirections like 2>&1 allowed before the pipe): the pipe's exit code hides the test's.
const PIPED_TEST = new RegExp(TEST_RUN + String.raw`(?:[^;&|\n]|\d?>&\d?|&>)*\|(?!\|)`)
const COMMIT_OR_PUSH = new RegExp(String.raw`\b${GIT}(?:commit|push)\b|\bgt\s+(?:create|modify|submit|c|m|ss|s)\b`)

export function bashRefusal(line: string): string | null {
  for (const cmd of commands(line)) {
    if (GT_SYNC.test(cmd))
      return 'gt sync is blocked: it restacks every session\'s local branches in the shared repo (Sep 25: 8 sessions\' branches rebased). After a merge, only fast-forward main: git branch -f main origin/main.'
    if (TMUX_KILL.test(cmd) && !/\s-S\s*\S/.test(cmd))
      return 'tmux kill-server/kill-session without -S is blocked: env-addressed tmux can fall back to the real server (Sep 28: killed the daemon and 18 sessions). Use tmux -S <exact socket you created>.'
    const stash = cmd.match(STASH)
    if (stash && stash[1] !== 'list' && stash[1] !== 'show')
      return 'git stash is blocked: the stash list is shared by every worktree, so pop/apply can take another session\'s stash. Commit to a branch, or add files by name.'
  }
  if (PIPED_TEST.test(line) && COMMIT_OR_PUSH.test(line))
    return 'Piping a test run and committing/pushing in the same command is blocked: the pipe hides the test\'s exit code (Sep 27: broken commits pushed twice). Run the tests, read the result, then commit in a separate call.'
  return null
}
