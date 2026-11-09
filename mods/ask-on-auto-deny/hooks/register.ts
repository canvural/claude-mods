import type { Register } from 'claude-code'

const ALLOW = 'Allow once'
const KEEP = 'Keep blocked'
const MAX_SUMMARY = 300

type Denial = { tool: string; input: unknown; reason: string }

// What the call would do, short enough to read in the dialog.
function summarize(input: unknown): string {
  const fields = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const main = fields.command ?? fields.file_path ?? fields.url
  const text = typeof main === 'string' ? main : JSON.stringify(input) ?? ''
  return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY)}…` : text
}

export const register: Register = on => {
  // Calls auto mode just denied, by tool_use_id, until their tool.call hook reads them.
  const denied = new Map<string, Denial>()
  // Calls the person allowed after a denial, while their second run is in flight.
  const approved = new Set<string>()

  // Auto mode's denial is only announced here: tool.check runs before the classifier.
  on('classic.PermissionDenied', ($, e, next) => {
    denied.set(e.tool_use_id, { tool: e.tool_name, input: e.tool_input, reason: e.reason })
    return next(e)
  })

  // On the second run, settle the ask the classifier would get as the person's own
  // allow. A deny (a deny rule, a managed hook) stays a deny.
  on('tool.check', async ($, e, next) => {
    const decided = await next(e)
    if (decided.decision !== 'ask') return decided
    if (e.tool_use_id === undefined || !approved.has(e.tool_use_id)) return decided
    return { decision: 'allow', reason: 'Allowed by the user after auto mode blocked it.' }
  })

  on('tool.call', async ($, e, next) => {
    const first = await next(e)
    const denial = denied.get(e.tool_use_id)
    if (denial === undefined) return first
    denied.delete(e.tool_use_id)

    let answer = KEEP
    try {
      answer = await $.ui.ask(
        `Auto mode blocked ${denial.tool}: ${summarize(denial.input)}\nReason: ${denial.reason}\nRun it anyway?`,
        { options: [ALLOW, KEEP], header: 'Auto mode' },
      )
    } catch {
      // Dismissed, or nobody to ask (claude -p): the denial stands.
    }
    if (answer !== ALLOW) return first

    approved.add(e.tool_use_id)
    try {
      return await next(e)
    } finally {
      approved.delete(e.tool_use_id)
      denied.delete(e.tool_use_id)
    }
  })
}
