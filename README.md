# @wxn0brp/db-lock

Designed to safely handle multiple processes accessing the same ValtheraDB instance simultaneously

## Overview

This package provides a locking mechanism that ensures thread-safe database operations by using file-based locks. It's designed to work with the ValtheraDB ecosystem and prevents concurrent write operations that could lead to data corruption or inconsistencies.

## Installation

```bash
npm i @wxn0brp/db-lock @wxn0brp/db-core @wxn0brp/db-storage-dir
```

or

```bash
npm i @wxn0brp/db-lock @wxn0brp/db
```

## Features

- **File-based locks**: Uses filesystem operations to coordinate locks
- **Stale lock detection**: Automatically removes lock files that have exceeded the stale threshold
- **Retry mechanism**: Configurable retry count and timing for lock acquisition
- **Proxy-based**: Transparently wraps database operations without changing your code
- **Lightweight**: Minimal overhead with efficient lock management

## Usage

```typescript
import { createLock } from "@wxn0brp/db-lock";
import { ValtheraClass } from "@wxn0brp/db-core";

const db = new ValtheraClass();
const lockedDb = createLock(db);

// Now use lockedDb as you would use your original database instance
// Locks will be automatically acquired for write operations and released afterwards
```

## Configuration Options

| Option      | Type    | Default    | Description |
|-------------|---------|------------|-------------|
| `file`      | string  | "valthera.lock" | Path to the lock file |
| `stale`     | number  | 5000       | Time in milliseconds after which a lock is considered stale and can be removed |
| `retryTime` | number  | 50         | Time in milliseconds to wait between lock acquisition attempts |
| `retryCount`| number  | 50         | Number of retry attempts before throwing an error |

## How It Works

The locking mechanism works by creating a lock file when a database operation begins and removing it when the operation completes. Operations that try to access the database while a lock exists will wait until the lock is released.

The library automatically detects and removes stale locks that have been held longer than the configured stale threshold, preventing indefinite blocking (e.g., if a lock process is crashed).

The proxy only intercepts operations that contain "add", "find", "remove", or "update" in their method names, allowing other database methods to pass through unaffected.

## License

MIT