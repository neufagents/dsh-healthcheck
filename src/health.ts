/**
 * NeufAgents · dsh health check —— 纯逻辑层
 * 零 dsh 运行时依赖,全部可单测。
 */

// ---------- 类型(与 dsh 服务快照的兼容子集) ----------

export interface SessionSnapshotLike {
  id: string
  eventCount?: number
  sizeBytes?: number
}

export interface EventLike {
  type: string
}

// ---------- 阈值 ----------

export const BIG_SIZE_WARN = 10 * 1024 * 1024 // 10 MB
export const BIG_SIZE_DANGER = 30 * 1024 * 1024 // 30 MB
export const BIG_EVENTS_WARN = 3000
export const BIG_EVENTS_DANGER = 8000

// ---------- 工具函数 ----------

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function shortId(id: string, n = 12): string {
  return id.length > n ? `${id.slice(0, n)}…` : id
}

// ---------- 会话库分析 ----------

export interface LibraryStats {
  total: number
  totalBytes: number
  totalEvents: number
  largest: SessionSnapshotLike[]
  busiest: SessionSnapshotLike[]
  warnings: string[]
}

export function analyzeLibrary(sessions: readonly SessionSnapshotLike[], topN = 5): LibraryStats {
  const total = sessions.length
  const totalBytes = sessions.reduce((s, x) => s + (x.sizeBytes ?? 0), 0)
  const totalEvents = sessions.reduce((s, x) => s + (x.eventCount ?? 0), 0)
  const largest = [...sessions].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0)).slice(0, topN)
  const busiest = [...sessions].sort((a, b) => (b.eventCount ?? 0) - (a.eventCount ?? 0)).slice(0, topN)

  const warnings: string[] = []
  for (const s of sessions) {
    const sz = s.sizeBytes ?? 0
    if (sz >= BIG_SIZE_DANGER) warnings.push(`[高危] 会话 ${shortId(s.id)} 体积 ${formatBytes(sz)}(≥30MB,OOM 风险高)`)
    else if (sz >= BIG_SIZE_WARN) warnings.push(`[关注] 会话 ${shortId(s.id)} 体积 ${formatBytes(sz)}(≥10MB)`)
    const ev = s.eventCount ?? 0
    if (ev >= BIG_EVENTS_DANGER) warnings.push(`[高危] 会话 ${shortId(s.id)} 事件数 ${ev}(≥8000,上下文膨胀严重)`)
    else if (ev >= BIG_EVENTS_WARN) warnings.push(`[关注] 会话 ${shortId(s.id)} 事件数 ${ev}(≥3000)`)
  }
  return { total, totalBytes, totalEvents, largest, busiest, warnings }
}

// ---------- 单会话日志分析 ----------

export interface LogAnalysis {
  eventCount: number
  /** 尾部是否已闭合(最后一个 turn 事件是 turn/end) */
  balanced: boolean
  /** 最后一个 turn/* 事件的类型(空日志为 undefined) */
  lastTurnEvent?: string
  toolCalls: number
  toolResults: number
  unmatchedToolCalls: number
  typeCounts: Record<string, number>
  hints: string[]
}

export function analyzeLog(events: readonly EventLike[]): LogAnalysis {
  const typeCounts: Record<string, number> = {}
  let toolCalls = 0
  let toolResults = 0
  let lastTurnEvent: string | undefined

  for (const e of events) {
    const t = e.type
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
    if (t === 'tool/call') toolCalls++
    else if (t === 'tool/result') toolResults++
    if (t === 'turn/start' || t === 'turn/end') lastTurnEvent = t
  }

  const unmatched = Math.max(0, toolCalls - toolResults)
  const balanced = events.length === 0 || lastTurnEvent === 'turn/end'

  const hints: string[] = []
  if (events.length === 0) hints.push('空日志(会话已创建但未写入事件)。')
  if (!balanced) hints.push('检测到未闭合的轮次尾部(疑似崩溃遗留):dsh 在下次 resume 时会自动补全,无需手动修复。')
  if (unmatched > 0) hints.push(`${unmatched} 个工具调用缺少结果记录(崩溃或中止的正常特征;resume 时会被补上错误结果)。`)

  return {
    eventCount: events.length,
    balanced,
    lastTurnEvent,
    toolCalls,
    toolResults,
    unmatchedToolCalls: unmatched,
    typeCounts,
    hints,
  }
}

// ---------- 报告生成 ----------

export function formatLibraryReport(stats: LibraryStats): string {
  const lines: string[] = []
  lines.push('# dsh 健康体检 · 会话库')
  lines.push('')
  lines.push(`- 会话总数:**${stats.total}**`)
  lines.push(`- 占用体积:**${formatBytes(stats.totalBytes)}**`)
  lines.push(`- 事件总数:**${stats.totalEvents}**`)
  lines.push('')
  if (stats.largest.length > 0) {
    lines.push('## 体积 Top ' + stats.largest.length)
    for (const s of stats.largest) {
      lines.push(`- ${shortId(s.id)} — ${formatBytes(s.sizeBytes ?? 0)} / ${s.eventCount ?? '?'} 事件`)
    }
    lines.push('')
  }
  if (stats.warnings.length > 0) {
    lines.push('## 异常提示')
    for (const w of stats.warnings) lines.push(`- ${w}`)
    lines.push('')
    lines.push('> 超大会话通常意味着上下文无界膨胀,是长任务 OOM 的常见诱因。')
  } else {
    lines.push('## 异常提示')
    lines.push('- 未发现体积/事件数异常。')
  }
  lines.push('')
  lines.push('_由 NeufAgents dsh-health 生成(只读检查,未修改任何数据)_')
  return lines.join('\n')
}

export function formatLogReport(
  id: string,
  snap: { eventCount?: number; sizeBytes?: number },
  a: LogAnalysis,
): string {
  const lines: string[] = []
  lines.push(`# dsh 健康体检 · 单会话 ${shortId(id)}`)
  lines.push('')
  lines.push(`- 体积:**${formatBytes(snap.sizeBytes ?? 0)}**`)
  lines.push(`- 事件数:**${a.eventCount}**`)
  lines.push(`- 尾部闭合:**${a.balanced ? '✅ 已闭合' : '⚠️ 未闭合(疑似崩溃遗留)'}**`)
  if (a.lastTurnEvent) lines.push(`- 最后一个轮次事件:\`${a.lastTurnEvent}\``)
  lines.push(`- 工具配对:call ${a.toolCalls} / result ${a.toolResults}${a.unmatchedToolCalls > 0 ? `(**缺 ${a.unmatchedToolCalls}**)` : ''}`)
  lines.push('')
  if (a.hints.length > 0) {
    lines.push('## 提示')
    for (const h of a.hints) lines.push(`- ${h}`)
    lines.push('')
  }
  const topTypes = Object.entries(a.typeCounts).sort((x, y) => y[1] - x[1]).slice(0, 12)
  if (topTypes.length > 0) {
    lines.push('## 事件分布(前 12)')
    for (const [t, n] of topTypes) lines.push(`- \`${t}\` × ${n}`)
  }
  lines.push('')
  lines.push('_由 NeufAgents dsh-health 生成(只读检查)_')
  return lines.join('\n')
}
