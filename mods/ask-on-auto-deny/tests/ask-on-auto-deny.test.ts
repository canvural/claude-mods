import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const COMMAND = 'git push origin v1.0.0'
const REASON = 'Pushing a tag publishes a release.'

// Stands for the engine beneath the mod. The kit runs tool.check before the test's
// own tool.call hook: the rules answer ask, and the mode's decider (a
// PermissionRequest hook, standing in for auto mode's classifier) refuses it. A
// call that gets through runs.
function standIn($: Engine, on: On, answer: string | undefined) {
  const classified: string[] = []
  const ran: string[] = []
  const questions: string[] = []

  // PermissionRequest carries no tool_use_id, so the decider takes it from the check.
  let checking: string | undefined
  on('tool.check', { tool: 'Bash' }, (_$, e) => {
    checking = e.tool_use_id
    return { decision: 'ask' }
  })
  on('classic.PermissionDenied', () => ({}))

  on('classic.PermissionRequest', async (_$, e) => {
    classified.push(e.tool_name)
    await $.classic.PermissionDenied({
      tool_name: e.tool_name,
      tool_input: e.tool_input,
      tool_use_id: checking ?? '',
      reason: REASON,
    })
    return { decision: { behavior: 'deny', message: REASON } }
  })

  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const question = e.questions[0]?.question ?? ''
    questions.push(question)
    if (answer === undefined) throw new Error('dismissed')
    return { result: { questions: e.questions, answers: { [question]: answer } } }
  })

  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    ran.push(e.command)
    return { result: { stdout: 'pushed', stderr: '', interrupted: false } }
  })

  return { classified, ran, questions }
}

test('runs a call auto mode denied once the person allows it', async ($, on) => {
  const { classified, ran, questions } = standIn($, on, 'Allow once')

  const result = await $.tool.call({ tool: 'Bash', command: COMMAND })

  expect(classified).toEqual(['Bash'])
  expect(ran).toEqual([COMMAND])
  expect(questions).toHaveLength(1)
  expect(questions[0]).toContain(COMMAND)
  expect(questions[0]).toContain(REASON)
  expect(result.isError).toBeUndefined()
  expect(result.deny).toBeUndefined()
})

test('keeps the denial when the person keeps it blocked', async ($, on) => {
  const { ran, questions } = standIn($, on, 'Keep blocked')

  const result = await $.tool.call({ tool: 'Bash', command: COMMAND })

  expect(ran).toEqual([])
  expect(questions).toHaveLength(1)
  expect(result.isError).toBe(true)
})

test('keeps the denial when the question is dismissed', async ($, on) => {
  const { ran, questions } = standIn($, on, undefined)

  const result = await $.tool.call({ tool: 'Bash', command: COMMAND })

  expect(ran).toEqual([])
  expect(questions).toHaveLength(1)
  expect(result.isError).toBe(true)
})

test('an allowed call is not asked about and the allow is not reused', async ($, on) => {
  const ran: string[] = []
  let asked = 0
  on('tool.check', { tool: 'Bash' }, () => ({ decision: 'allow' }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => {
    asked += 1
    throw new Error('not expected')
  })
  on('tool.call', { tool: 'Bash' }, (_$, e) => {
    ran.push(e.command)
    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  await $.tool.call({ tool: 'Bash', command: 'ls' })

  expect(ran).toEqual(['ls'])
  expect(asked).toBe(0)
})
