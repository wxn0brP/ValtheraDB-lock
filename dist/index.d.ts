import { ValtheraClass, ValtheraCompatible } from "@wxn0brp/db-core";
export interface LockOpts {
    file?: string;
    stale?: number;
    retryTime?: number;
    retryCount?: number;
}
export declare function createLock(db: ValtheraClass, opts?: LockOpts): ValtheraClass;
export declare function createLock(db: ValtheraCompatible, opts?: LockOpts): ValtheraCompatible;
