import { expect, test } from 'claude-code/testing'
import { isMermaidFile, lastChat } from './diagram.ts'

test('only .mmd files render', () => {
  expect(isMermaidFile('/w/design/map.mmd')).toBe(true)
  expect(isMermaidFile('/w/design/map.md')).toBe(false)
})

test('last chat comes from the newest wrapped Discord message', () => {
  const m = (c: string) => `<channel source="plugin:discord:discord" chat_id="${c}" message_id="1" user="sf" user_id="2" ts="x">hi</channel>`
  expect(lastChat(m('111') + m('222'))).toBe('222')
  expect(lastChat('plain prompt')).toBeUndefined()
})
