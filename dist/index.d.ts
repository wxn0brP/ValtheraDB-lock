import { ValtheraCompatible } from "@wxn0brp/db-core";
export interface LockOpts {
    file?: string;
    stale?: number;
    retryTime?: number;
    retryCount?: number;
}
export declare function createLock<T extends ValtheraCompatible>(db: T, opts?: LockOpts): T;
