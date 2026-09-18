/**
 * NeufAgents · dsh health check —— 纯逻辑层
 * 零 dsh 运行时依赖,全部可单测。
 */
export interface SessionSnapshotLike {
    id: string;
    eventCount?: number;
    sizeBytes?: number;
}
export interface EventLike {
    type: string;
}
export declare const BIG_SIZE_WARN: number;
export declare const BIG_SIZE_DANGER: number;
export declare const BIG_EVENTS_WARN = 3000;
export declare const BIG_EVENTS_DANGER = 8000;
export declare function formatBytes(n: number): string;
export declare function shortId(id: string, n?: number): string;
export interface LibraryStats {
    total: number;
    totalBytes: number;
    totalEvents: number;
    largest: SessionSnapshotLike[];
    busiest: SessionSnapshotLike[];
    warnings: string[];
}
export declare function analyzeLibrary(sessions: readonly SessionSnapshotLike[], topN?: number): LibraryStats;
export interface LogAnalysis {
    eventCount: number;
    /** 尾部是否已闭合(最后一个 turn 事件是 turn/end) */
    balanced: boolean;
    /** 最后一个 turn/* 事件的类型(空日志为 undefined) */
    lastTurnEvent?: string;
    toolCalls: number;
    toolResults: number;
    unmatchedToolCalls: number;
    typeCounts: Record<string, number>;
    hints: string[];
}
export declare function analyzeLog(events: readonly EventLike[]): LogAnalysis;
export declare function formatLibraryReport(stats: LibraryStats): string;
export declare function formatLogReport(id: string, snap: {
    eventCount?: number;
    sizeBytes?: number;
}, a: LogAnalysis): string;
