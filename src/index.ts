import { ValtheraClass, ValtheraCompatible } from "@wxn0brp/db-core";
import { unlink, open, stat } from "fs/promises";

const lockOp = ["add", "find", "remove", "update", "toggle"];
const hasOp = (op: string) => lockOp.some(v => op.includes(v));

export interface LockOpts {
    file?: string;
    stale?: number;
    retryTime?: number;
    retryCount?: number;
}

async function unlock(lockFile: string) {
    try {
        await unlink(lockFile);
    } catch { }
}

async function waitLock(opts: LockOpts) {
    let i = 0;
    while (true) {
        if (opts.retryCount && i++ > opts.retryCount) {
            throw new Error("Failed to acquire lock");
        }

        try {
            const fd = await open(opts.file, "wx");
            await fd.close();
            break;
        } catch {
            try {
                const s = await stat(opts.file);
                if (Date.now() - s.mtimeMs > opts.stale) {
                    await unlink(opts.file);
                }
            } catch { }
            await new Promise(r => setTimeout(r, opts.retryTime || 50));
        }
    }
}

export function createLock<T extends ValtheraCompatible>(db: T, opts: LockOpts = {}): T {
    opts = {
        file: "valthera.lock",
        stale: 5000,
        retryTime: 50,
        retryCount: 50,
        ...opts
    };

    return new Proxy(db, {
        get: (target, prop) => {
            if (!hasOp(prop.toString())) return target[prop];
            const origMethod = target[prop];
            return async (...args: any[]) => {
                await waitLock(opts);
                try {
                    return await origMethod.bind(target)(...args);
                } finally {
                    await unlock(opts.file);
                }
            };
        }
    });
}
