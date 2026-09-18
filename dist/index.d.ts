import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-healthcheck";
export declare const inject: readonly ["tools", "sessionPersistence"];
export declare function apply(ctx: Context): void;
