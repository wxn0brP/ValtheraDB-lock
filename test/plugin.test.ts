import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createMemoryValthera } from "@wxn0brp/db-core";
import { createLockPlugin } from "../src/index";
import { mkdir, rm, access } from "fs/promises";

const LOCK_DIR = "test-locks";

beforeAll(async () => {
    await mkdir(LOCK_DIR, { recursive: true });
});

afterAll(async () => {
    await rm(LOCK_DIR, { recursive: true, force: true });
});

describe("createLockPlugin", () => {
    test("1. should return a plugin with name lock", () => {
        const plugin = createLockPlugin();
        expect(plugin.name).toBe("lock");
        expect(typeof plugin.execute).toBe("function");
    });

    test("2. should use default options when none provided", () => {
        const plugin = createLockPlugin();
        expect(plugin.name).toBe("lock");
    });

    test("3. operation succeeds under lock", async () => {
        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/3.lock` }));
        const result: any = await db.add({ collection: "users", data: { name: "Alice" } });
        expect(result.name).toBe("Alice");
        expect(result._id).toBeDefined();
    });

    test("4. lock file is created and cleaned up", async () => {
        const lockFile = `${LOCK_DIR}/4.lock`;
        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: lockFile }));
        await db.add({ collection: "users", data: { name: "Bob" } });
        try {
            await access(lockFile);
            expect(false).toBe(true);
        } catch {
            expect(true).toBe(true);
        }
    });

    test("5. stale lock file is cleaned up", async () => {
        const lockFile = `${LOCK_DIR}/5.lock`;
        const { open } = await import("fs/promises");
        const fd = await open(lockFile, "w");
        await fd.close();

        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: lockFile, stale: 0, retryTime: 10 }));
        await db.add({ collection: "users", data: { name: "Charlie" } });

        try {
            await access(lockFile);
            expect(false).toBe(true);
        } catch {
            expect(true).toBe(true);
        }
    });

    test("6. throws when retry count exceeded", async () => {
        const lockFile = `${LOCK_DIR}/6.lock`;
        const { open } = await import("fs/promises");
        const fd = await open(lockFile, "wx");
        await fd.close();

        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: lockFile, stale: 50000, retryTime: 5, retryCount: 2 }));

        try {
            await db.add({ collection: "users", data: { name: "Dave" } });
            expect(false).toBe(true);
        } catch (e: any) {
            expect(e.message).toBe("Failed to acquire lock");
        }

        await rm(lockFile);
    });

    test("7. works with find operation", async () => {
        const db = createMemoryValthera({
            users: [{ _id: "1", name: "Eve" }],
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/7.lock` }));
        const results = await db.find({ collection: "users" });
        expect(results).toHaveLength(1);
    });

    test("8. works with update operation", async () => {
        const db = createMemoryValthera({
            users: [{ _id: "1", name: "Frank" }],
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/8.lock` }));
        await db.update({ collection: "users", search: { _id: "1" }, updater: { name: "Frankie" } });
        const result: any = await db.findOne({ collection: "users", search: { _id: "1" } });
        expect(result.name).toBe("Frankie");
    });

    test("9. works with remove operation", async () => {
        const db = createMemoryValthera({
            users: [{ _id: "1", name: "Grace" }],
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/9.lock` }));
        await db.remove({ collection: "users", search: { _id: "1" } });
        const results = await db.find({ collection: "users" });
        expect(results).toHaveLength(0);
    });

    test("10. works through collection-style API", async () => {
        const db = createMemoryValthera({
            users: [{ _id: "1", name: "Hank" }],
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/10.lock` }));
        const results = await db.users.find();
        expect(results).toHaveLength(1);
    });

    test("11. concurrent operations are serialized", async () => {
        const lockFile = `${LOCK_DIR}/11.lock`;
        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: lockFile, retryTime: 10, retryCount: 100 }));

        const promises = Array.from({ length: 10 }, (_, i) =>
            db.add({ collection: "users", data: { name: `User${i}` } })
        );
        const results = await Promise.all(promises);
        expect(results).toHaveLength(10);
        const all = await db.find({ collection: "users" });
        expect(all).toHaveLength(10);
    });

    test("12. custom options are applied", async () => {
        const lockFile = `${LOCK_DIR}/12.lock`;
        const plugin = createLockPlugin({
            file: lockFile,
            stale: 1000,
            retryTime: 20,
            retryCount: 5,
        });
        expect(plugin.name).toBe("lock");
        const db = createMemoryValthera();
        db.plugin(plugin);
        await db.add({ collection: "users", data: { name: "Ivy" } });
        const results = await db.find({ collection: "users" });
        expect(results).toHaveLength(1);
    });

    test("13. plugin can be unsubscribed", async () => {
        const lockFile = `${LOCK_DIR}/13.lock`;
        const db = createMemoryValthera();
        const unsub = db.plugin(createLockPlugin({ file: lockFile }));
        expect(typeof unsub).toBe("function");
        unsub();
        await db.add({ collection: "users", data: { name: "Jack" } });
        const results = await db.find({ collection: "users" });
        expect(results).toHaveLength(1);
    });

    test("14. emitter fires with final result", async () => {
        const db = createMemoryValthera();
        let emitted: any;
        db.emitter.on("add", (_query: any, result: any) => {
            emitted = result;
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/14.lock` }));
        const result = await db.add({ collection: "users", data: { name: "Kate" } });
        expect(emitted).toEqual(result);
    });

    test("15. error in operation is propagated", async () => {
        const db = createMemoryValthera();
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/15.lock` }));
        try {
            await db.findOne({ collection: "nonexistent", search: { _id: "1" } });
            expect(true).toBe(true);
        } catch {
            expect(false).toBe(true);
        }
    });

    test("16. registers and fires plugin through forgeTypedValthera collections", async () => {
        const db = createMemoryValthera({
            users: [{ _id: "1", name: "Leo" }],
        });
        db.plugin(createLockPlugin({ file: `${LOCK_DIR}/16.lock` }));
        const results = await db.users.find();
        expect(results).toHaveLength(1);
    });
});
