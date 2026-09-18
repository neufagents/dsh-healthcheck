// NeufAgents · dsh-health 单元测试(纯函数层)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeLibrary,
  analyzeLog,
  formatBytes,
  shortId,
  BIG_SIZE_DANGER,
  type EventLike,
} from '../src/health.ts'

test('formatBytes 基本换算', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2.0 KB')
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB')
})

test('shortId 截断', () => {
  assert.equal(shortId('abc'), 'abc')
  assert.equal(shortId('abcdefghijklmnop', 4), 'abcd…')
})

test('analyzeLibrary 空库', () => {
  const r = analyzeLibrary([])
  assert.equal(r.total, 0)
  assert.equal(r.totalBytes, 0)
  assert.equal(r.warnings.length, 0)
})

test('analyzeLibrary 汇总与告警', () => {
  const r = analyzeLibrary([
    { id: 'a', sizeBytes: 100, eventCount: 10 },
    { id: 'b', sizeBytes: BIG_SIZE_DANGER + 1, eventCount: BIG_SIZE_DANGER }, // 双高危
    { id: 'c', sizeBytes: 200, eventCount: 20 },
  ])
  assert.equal(r.total, 3)
  assert.equal(r.totalBytes, 100 + BIG_SIZE_DANGER + 1 + 200)
  assert.equal(r.largest[0]!.id, 'b')
  assert.ok(r.warnings.length >= 2) // 体积高危 + 事件数高危
})

test('analyzeLog 平衡会话', () => {
  const events: EventLike[] = [
    { type: 'turn/start' },
    { type: 'step/start' },
    { type: 'tool/call' },
    { type: 'tool/result' },
    { type: 'step/end' },
    { type: 'turn/end' },
  ]
  const a = analyzeLog(events)
  assert.equal(a.balanced, true)
  assert.equal(a.lastTurnEvent, 'turn/end')
  assert.equal(a.unmatchedToolCalls, 0)
  assert.equal(a.hints.length, 0)
})

test('analyzeLog 崩溃尾巴(未闭合轮次 + 工具缺结果)', () => {
  const events: EventLike[] = [
    { type: 'turn/start' },
    { type: 'tool/call' },
    { type: 'tool/call' },
  ]
  const a = analyzeLog(events)
  assert.equal(a.balanced, false)
  assert.equal(a.lastTurnEvent, 'turn/start')
  assert.equal(a.toolCalls, 2)
  assert.equal(a.toolResults, 0)
  assert.equal(a.unmatchedToolCalls, 2)
  assert.ok(a.hints.some((h) => h.includes('未闭合')))
})

test('analyzeLog 空日志视为平衡', () => {
  const a = analyzeLog([])
  assert.equal(a.balanced, true)
  assert.ok(a.hints.some((h) => h.includes('空日志')))
})
