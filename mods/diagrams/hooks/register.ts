// Personal hydra mod (mods.local/diagrams, gitignored): a .mmd file written or edited in a session is
// rendered to a PNG and posted to the chat of that session's last Discord message.
import type { On } from 'claude-code'
import { isMermaidFile, lastChat } from './diagram.ts'

const BRIDGE = 'plugin:discord:discord'
const MMDC = 'mmdc' // Mermaid CLI: npm i -g @mermaid-js/mermaid-cli

let chat: string | undefined
// Last posted text per file: an edit that leaves the diagram unchanged posts nothing.
const posted = new Map<string, string>()

export function register(on: On) {
  on('prompt.submit', async ($, e, next) => {
    chat = lastChat(e.text) ?? chat
    return next(e)
  })

  for (const tool of ['Write', 'Edit'] as const) {
    on('tool.call', { tool }, async ($, e, next) => {
      const r = await next(e)
      if (r.deny || r.isError || !chat || !isMermaidFile(e.file_path)) return r
      const text = await $.fs.read(e.file_path)
      if (posted.get(e.file_path) === text) return r
      const name = e.file_path.split('/').at(-1)!.replace(/\.mmd$/, '')
      // PNGs go here; deny Read on it in settings.json so a rendered diagram can't be opened into context.
      const png = `${await $.env.get('HOME')}/.claude/diagrams/${name}.png`
      const run = await $.process.run([MMDC, '-i', e.file_path, '-o', png, '-b', 'white', '-s', '2'])
      posted.set(e.file_path, text)
      await $.mcp.call(BRIDGE, 'reply', run.exitCode === 0
        ? { chat_id: chat, text: `Diagram: ${name}`, files: [png] }
        : { chat_id: chat, text: `Diagram ${name} failed to render:\n${run.stderr.slice(0, 500)}` })
      return r
    })
  }
}
