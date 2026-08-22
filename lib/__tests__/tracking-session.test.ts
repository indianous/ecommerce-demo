import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getOrCreateSessionId } from '../tracking-session'

describe('getOrCreateSessionId', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('creates and persists a session id on first call', () => {
    const id = getOrCreateSessionId()
    expect(id).toBeTruthy()
    expect(sessionStorage.getItem('page_view_session_id')).toBe(id)
  })

  it('reuses the stored session id on subsequent calls', () => {
    const first = getOrCreateSessionId()
    const second = getOrCreateSessionId()
    expect(second).toBe(first)
  })

  describe('in an insecure context (crypto.randomUUID unavailable)', () => {
    const originalRandomUUID = crypto.randomUUID

    beforeEach(() => {
      // jsdom's crypto.randomUUID lives on the prototype, so `delete` on the
      // instance is a no-op — assign undefined to actually shadow it.
      // @ts-expect-error simulating an insecure context, where randomUUID does not exist
      crypto.randomUUID = undefined
    })

    afterEach(() => {
      crypto.randomUUID = originalRandomUUID
    })

    it('falls back to a generated id instead of throwing', () => {
      expect(() => getOrCreateSessionId()).not.toThrow()
      const id = getOrCreateSessionId()
      expect(id).toBeTruthy()
      expect(sessionStorage.getItem('page_view_session_id')).toBe(id)
    })
  })
})
