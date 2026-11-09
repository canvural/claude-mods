# claude-mods

Mods for [Claude Code](https://code.claude.com/docs/en/plugins/mods/overview), published as the `canvural` plugin marketplace.

| Mod | What it does |
| :- | :- |
| [`ask-on-auto-deny`](mods/ask-on-auto-deny) | When auto mode's classifier blocks a tool call, asks you whether to run it anyway instead of silently moving on. |

## Install

Mods need Claude Code v2.1.287 or later (`claude --version`).

Add the marketplace once, then install a mod by name:

```bash
claude plugin marketplace add canvural/claude-mods
claude plugin install ask-on-auto-deny@canvural
```

Or do both from inside a session:

```
/plugin install ask-on-auto-deny --marketplace canvural/claude-mods
```

Run `/reload-plugins` in a session that was already open, or start a new one. `/plugin` lists the mods a session loaded.

To update later:

```bash
claude plugin update ask-on-auto-deny@canvural
```

## Before you install

A mod is code that runs inside Claude Code with your permissions. It is not sandboxed. Read the source first, and list what a mod hooks and calls without running it:

```bash
git clone https://github.com/canvural/claude-mods
claude plugin validate ./claude-mods/mods/ask-on-auto-deny
```

The mods API is early access and can change between Claude Code releases. CI runs every mod's tests against the latest Claude Code each week.

## Develop

```bash
claude plugin validate --strict .                 # the marketplace and every mod's manifest
claude plugin test mods/ask-on-auto-deny          # one mod's tests
claude --plugin-dir mods/ask-on-auto-deny         # load a mod for one session, reloading on save
```

## License

[MIT](LICENSE)
