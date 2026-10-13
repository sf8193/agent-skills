import { expect, test } from 'claude-code/testing'

// [command, blocked?]
const CASES: [string, boolean][] = [
  ['gt sync', true],
  ['cd ~/trading/options_bot && gt sync --force', true],
  ['gt submit --stack', false],
  ['gt log short', false],
  ['tmux kill-server', true],
  ['TMUX_TMPDIR=/tmp/x tmux kill-server', true],
  ['tmux kill-session -t cedar', true],
  ['tmux -S /tmp/s/sock kill-server', false],
  ['tmux -S "$dir/tmux-501/default" kill-server 2>/dev/null', false],
  ['tmux -S /tmp/s kill-server; tmux kill-session -t x', true],
  ['tmux ls', false],
  ['git stash', true],
  ['git stash pop', true],
  ['git -C ../wt stash push -m x', true],
  ['git stash list', false],
  ['git stash show -p', false],
  ['bun test 2>&1 | tail -5 && git commit -am x && git push', true],
  ['go test ./... | grep FAIL; gt submit', true],
  ['DISCORD_BOT_TOKEN=dummy bun run test --isolate 2>&1 | tail -4', false],
  ['bun test && git commit -m x', false],
  ['git log --oneline | head -3 && git push', false],
  ['echo "do not gt sync here"', false],
  ['rg "gt sync" docs', false],
  ['gt repo sync', true],
  ['cd ~/x\ngt sync', true],
  ['(cd ~/x && gt sync)', true],
  ['git -c core.x=y stash', true],
  ['git --no-pager stash pop', true],
  ['echo "use git stash" && git log | grep stash', false],
  ['echo "tmux kill-server is bad"', false],
  ['tmux -S/tmp/s kill-server', false],
  ['tmux -S"$x" kill-server', false],
  ['FOO=1 tmux kill-server', true],
  ['go test ./... 2>&1 | tail -3 && git commit -m x', true],
  ['bun run test | tail && git -c a=b commit -m x', true],
  ['pnpm test | tail -5; git push', true],
  ['npx vitest run | tail; gt modify', true],
  ['make test | tee out || git commit -am x', true],
  ['pytest -q | tail -1\ngit commit -m x', true],
  ['cargo test | tail && gt c -m x', true],
  ['scripts/test.sh | tail && gt submit', true],
  ['npm run test | tail && git -C ../wt push', true],
  ['git commit -m "fix go test" && git log | head', false],
  ['gh pr view | grep pytest && git push', false],
  ['bun test || git commit -m x', false],
]

for (const [command, blocked] of CASES) {
  test(`${blocked ? 'blocks' : 'allows'}: ${command}`, async ($, on) => {
    on('tool.call', () => ({ result: 'ran' }))
    const r = await $.tool.call({ tool: 'Bash', command })
    if (blocked) expect(typeof r.deny).toBe('string')
    else expect(r.result).toBe('ran')
  })
}

test('Read is never checked', async ($, on) => {
  on('tool.call', () => ({ result: 'ran' }))
  const r = await $.tool.call({ tool: 'Read', file_path: 'gt sync' })
  expect(r.result).toBe('ran')
})
