// The chat a prompt's Discord message came from (same wrapper hydra's mod parses, mod/hooks/reply.ts).
export function lastChat(text: string): string | undefined {
  return [...text.matchAll(/<channel source="plugin:discord:discord" chat_id="(\d+)" message_id="\d+" user="[^"]*" user_id="\d+"/g)].map(m => m[1]).at(-1)
}

export const isMermaidFile = (path: string): boolean => path.endsWith('.mmd')
