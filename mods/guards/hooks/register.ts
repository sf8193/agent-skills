// Personal hydra mod (mods.local/guards, gitignored): refuses the Bash commands behind past incidents.
import type { On } from 'claude-code'
import { bashRefusal } from './guards.ts'

export function register(on: On) {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = bashRefusal(e.command)
    return deny ? { deny } : next(e)
  })
}
