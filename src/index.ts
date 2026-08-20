import { ValtheraPlugin } from "@wxn0brp/db-core/types/plugin";
import { open, stat, unlink } from "fs/promises";

export interface LockOpts {
	file?: string;
	stale?: number;
	retryTime?: number;
	retryCount?: number;
}

async function unlock(lockFile: string) {
	try {
		await unlink(lockFile);
	} catch {}
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
				const stats = await stat(opts.file);
				if (Date.now() - stats.mtimeMs > opts.stale) {
					await unlink(opts.file);
				}
			} catch {}
			await new Promise(r => setTimeout(r, opts.retryTime || 50));
		}
	}
}

export function createLockPlugin(opts: LockOpts = {}): ValtheraPlugin {
	opts = {
		file: "valthera.lock",
		stale: 5000,
		retryTime: 50,
		retryCount: 50,
		...opts,
	};
	return {
		name: "lock",
		async execute(ctx) {
			await waitLock(opts);
			try {
				return await ctx.next();
			} finally {
				await unlock(opts.file);
			}
		},
	};
}
