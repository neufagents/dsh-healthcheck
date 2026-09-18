# dsh-healthcheck

**Runtime health check for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).** Read-only. Zero config.

A tiny plugin that helps you spot the two things that silently kill long dsh sessions: **runaway session size** (long-task OOM) and **crash-torn session logs**.

## What it does

One tool: `health_check`

- **`health_check`** (no arguments) — scans your whole session library:
  - totals: sessions / size / events
  - the largest sessions
  - warnings for oversized sessions (≥10 MB watch, ≥30 MB danger) and event-count blowups (≥3k watch, ≥8k danger) — the usual precursors of long-task OOM
- **`health_check session_id="<id>"`** — deep-inspects one session log:
  - tail balance (an unclosed turn means a crash tail; dsh auto-repairs it on resume — this just tells you it happened)
  - tool-call / result pairing
  - event-type distribution

Everything is **read-only** — it never modifies a single byte of your data.

## Install

```sh
dsh plugin --profile web add github:neufagents/dsh-healthcheck
```

Then restart dsh and ask your agent:

> run a health check on my dsh sessions

## Compatibility

- Tested with dsh `0.1.5-rc.2` (developer preview). The rc line moves fast; issues welcome.

## Development

```sh
npm i
npm test          # 11 tests (pure functions + contract)
npx @deepseek-ai/dsh --profile web --patch ./dev.patch.yml --dump-config
```

## License

MIT · made by [NeufAgents](https://neufagents.com)
