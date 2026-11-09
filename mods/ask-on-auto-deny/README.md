# ask-on-auto-deny

In [auto mode](https://code.claude.com/docs/en/permission-modes), when the classifier blocks a tool call, Claude is told no and carries on without it. This mod asks you instead: a dialog shows the blocked call and the classifier's reason, with **Allow once** and **Keep blocked**.

```bash
claude plugin marketplace add canvural/claude-mods
claude plugin install ask-on-auto-deny@canvural
```

## How it works

A mod can't turn the block into a prompt up front, because the permission-decision event (`tool.check`) fires before the classifier runs. So it reacts after the denial:

1. A `classic.PermissionDenied` hook records the call and the classifier's reason. That event fires only for auto-mode denials.
2. A `tool.call` hook sees the call come back denied and asks you, in the dialog Claude uses for its own questions.
3. On **Allow once**, it runs the same call again, and a `tool.check` hook answers `allow` for that one call, so the classifier isn't asked a second time.

**Keep blocked**, dismissing the dialog, or typing any other answer leaves the denial as it was.

## Limits

- It only upgrades an `ask` to an `allow`. A `deny` rule, or a refusal from a managed-settings hook, stays a refusal.
- `rm` on a critical path such as `/` or `~` stays denied.
- Under `claude -p` there is nobody to ask, so the denial stands.
- You still see Claude Code's own "blocked" notification before the dialog, and the first denial may still count toward auto mode's repeated-block thresholds.

## Status

Written against Claude Code 2.1.288 and 2.1.289, and confirmed there against a live classifier block in the Desktop app: the dialog appears and **Allow once** runs the blocked call. The tests run the hooks against a stand-in for the engine and pass on 2.1.319. The mods API is early access and can change between releases.

Without a mod, Claude Code already offers `/permissions` → **Recently denied** → `r` to retry a blocked call with manual approval. A built-in setting for this behaviour is requested in [anthropics/claude-code#92279](https://github.com/anthropics/claude-code/issues/92279).

## Develop

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```
