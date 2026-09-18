// NeufAgents · dsh-health —— 插件入口
// 注册 health_check 工具:会话库体检 + 单会话深检(只读,零风险)
import { defineTool } from '@deepseek-ai/dsh-tools';
import { analyzeLibrary, analyzeLog, formatLibraryReport, formatLogReport } from "./health.js";
export const name = 'dsh-healthcheck';
export const inject = ['tools', 'sessionPersistence'];
export function apply(ctx) {
    ctx.tools.register(defineTool({
        name: 'health_check',
        description: 'dsh runtime health check. Without arguments: scans the whole session library and reports size/event anomalies (risk of long-task OOM). With session_id: deep-inspects one session log for a crash tail (unclosed turn) and tool-call pairing. Read-only.',
        parameters: {
            session_id: {
                type: 'string',
                description: 'Optional session id for deep log inspection.',
            },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        async execute(args, exec) {
            const sp = ctx.sessionPersistence;
            if (args.session_id) {
                const snap = await sp.stat(args.session_id);
                if (!snap)
                    return `未找到会话 ${args.session_id}`;
                const handle = await sp.open(args.session_id, 'read');
                try {
                    const res = await handle.read(0, undefined, { signal: exec.signal });
                    const events = res.events.map((e) => ({ type: e.type }));
                    return formatLogReport(args.session_id, snap, analyzeLog(events));
                }
                finally {
                    await handle.close();
                }
            }
            const list = await sp.list();
            const sessions = list.map((s) => ({
                id: s.header.id,
                eventCount: s.eventCount,
                sizeBytes: s.sizeBytes,
            }));
            return formatLibraryReport(analyzeLibrary(sessions));
        },
    }));
}
