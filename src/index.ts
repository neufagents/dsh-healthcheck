// NeufAgents · dsh-health —— 插件入口
// 注册 health_check 工具:会话库体检 + 单会话深检(只读,零风险)

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { analyzeLibrary, analyzeLog, formatLibraryReport, formatLogReport, type EventLike } from './health.ts'

export const name = 'dsh-healthcheck'
export const inject = ['tools', 'sessionPersistence'] as const

export function apply(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: 'health_check',
      description:
        'dsh runtime health check. Without arguments: scans the whole session library and reports size/event anomalies (risk of long-task OOM). With session_id: deep-inspects one session log for a crash tail (unclosed turn) and tool-call pairing. Read-only.',
      parameters: {
        session_id: {
          type: 'string',
          description: 'Optional session id for deep log inspection.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args: unknown, value: string) => [{ type: 'text', text: value }],
      },
      async execute(args: { session_id?: string }, exec: { signal: AbortSignal }) {
        const sp = (ctx as unknown as { sessionPersistence: any }).sessionPersistence

        if (args.session_id) {
          const snap = await sp.stat(args.session_id)
          if (!snap) return `未找到会话 ${args.session_id}`
          const handle = await sp.open(args.session_id, 'read')
          try {
            const res = await handle.read(0, undefined, { signal: exec.signal })
            const events: EventLike[] = (res.events as readonly { type: string }[]).map((e) => ({ type: e.type }))
            return formatLogReport(args.session_id, snap, analyzeLog(events))
          } finally {
            await handle.close()
          }
        }

        const list = await sp.list()
        const sessions = (list as readonly any[]).map((s) => ({
          id: s.header.id as string,
          eventCount: s.eventCount as number | undefined,
          sizeBytes: s.sizeBytes as number | undefined,
        }))
        return formatLibraryReport(analyzeLibrary(sessions))
      },
    }),
  )
}
