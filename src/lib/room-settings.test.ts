import { describe, expect, it } from 'vitest'

import {
  RoomSettingsSchema,
  defaultRoomSettings,
  parseRoomSettings,
} from './room-settings'

/** Collect `path: message` for every issue so failures name the field. */
function issuesOf(input: unknown) {
  const result = RoomSettingsSchema.safeParse(input)
  expect(result.success, `expected rejection for ${JSON.stringify(input)}`)
    .toBe(false)
  if (result.success) throw new Error('unreachable')
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

describe('room settings defaults', () => {
  it('parses an empty object into the defaults', () => {
    expect(parseRoomSettings({})).toEqual(defaultRoomSettings)
  })

  it('parses the default settings themselves', () => {
    expect(parseRoomSettings(defaultRoomSettings)).toEqual(defaultRoomSettings)
  })

  it('accepts a fully specified valid submission', () => {
    expect(
      parseRoomSettings({
        eventType: '222',
        roundCount: 1,
        inspectionSeconds: 0,
        readyTimeoutSeconds: 120,
      }),
    ).toEqual({
      eventType: '222',
      roundCount: 1,
      inspectionSeconds: 0,
      readyTimeoutSeconds: 120,
    })
  })
})

describe('eventType', () => {
  it('rejects an unsupported event naming its field', () => {
    const issues = issuesOf({ ...defaultRoomSettings, eventType: '1111' })
    expect(issues).toHaveLength(1)
    expect(issues[0].path).toBe('eventType')
    expect(issues[0].message).toContain('eventType')
  })

  it('rejects a non-event string naming its field', () => {
    const issues = issuesOf({ ...defaultRoomSettings, eventType: '' })
    expect(issues[0].path).toBe('eventType')
  })

  it('accepts the events the scrambler supports', () => {
    for (const eventType of ['222', '333', '444', 'pymx', 'sq1', 'fto']) {
      expect(parseRoomSettings({ eventType }).eventType).toBe(eventType)
    }
  })
})

describe('numeric bounds', () => {
  const cases: Array<{ field: keyof typeof defaultRoomSettings; bad: unknown }> = [
    { field: 'roundCount', bad: 0 },
    { field: 'roundCount', bad: 21 },
    { field: 'inspectionSeconds', bad: -1 },
    { field: 'inspectionSeconds', bad: 61 },
    { field: 'readyTimeoutSeconds', bad: 4 },
    { field: 'readyTimeoutSeconds', bad: 121 },
  ]

  for (const { field, bad } of cases) {
    it(`rejects ${field}=${bad} naming its field`, () => {
      const issues = issuesOf({ ...defaultRoomSettings, [field]: bad })
      expect(issues).toHaveLength(1)
      expect(issues[0].path).toBe(field)
      expect(issues[0].message).toContain(field)
    })
  }
})
