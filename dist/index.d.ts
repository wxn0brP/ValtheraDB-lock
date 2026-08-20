import { ValtheraPlugin } from "@wxn0brp/db-core/types/plugin";
export interface LockOpts {
    file?: string;
    stale?: number;
    retryTime?: number;
    retryCount?: number;
}
export declare function createLockPlugin(opts?: LockOpts): ValtheraPlugin;
