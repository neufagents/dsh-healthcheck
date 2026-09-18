// NeufAgents · dsh-health 契约测试:模拟 dsh 运行时,验证工具注册与执行(不依赖 LLM)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/index.ts'

function makeFakeEnv(sessions: any[]) {
  let registered: any
  const ctx = {
    tools: { register: (t: any) => { registered = t } },
    sessionPersistence: {
      list: async () => sessions,
      stat: async (id: string) => sessions.find((s) => s.header.id === id),
      open: async (_id: string, _access: string) => ({
        read: async () => ({
          events: [{ type: 'turn/start' }, { type: 'tool/call' }, { type: 'tool/call' }],
        }),
        close: async () => {},
      }),
    },
  }
  return { ctx, getTool: () => registered }
}

test('apply 注册 health_check 工具', () => {
  const { ctx, getTool } = makeFakeEnv([])
  apply(ctx as any)
  const tool = getTool()
  assert.equal(tool.name, 'health_check')
  assert.ok(tool.description.length > 0)
})

test('execute 库体检:输出汇总与告警', async () => {
  const { ctx, getTool } = makeFakeEnv([
    { header: { id: 'normal-session' }, eventCount: 100, sizeBytes: 2048 },
    { header: { id: 'huge-session-xxxxxxxx' }, eventCount: 9000, sizeBytes: 40 * 1024 * 1024 },
  ])
  apply(ctx as any)
  const tool = getTool()
  const out: string = await tool.execute({}, { signal: new AbortController().signal })
  assert.ok(out.includes('会话总数'), '包含汇总')
  assert.ok(out.includes('huge-session'), '包含大会话')
  assert.ok(out.includes('高危'), '包含高危告警')
})

test('execute 深检:识别崩溃尾巴', async () => {
  const { ctx, getTool } = makeFakeEnv([
    { header: { id: 's1' }, eventCount: 3, sizeBytes: 500 },
  ])
  apply(ctx as any)
  const tool = getTool()
  const out: string = await tool.execute({ session_id: 's1' }, { signal: new AbortController().signal })
  assert.ok(out.includes('单会话'), '包含标题')
  assert.ok(out.includes('未闭合'), '识别未闭合轮次(fixture: turn/start + 2×tool/call)')
})

test('execute 深检:未找到会话', async () => {
  const { ctx, getTool } = makeFakeEnv([])
  apply(ctx as any)
  const tool = getTool()
  const out: string = await tool.execute({ session_id: 'ghost' }, { signal: new AbortController().signal })
  assert.ok(out.includes('未找到'))
})
