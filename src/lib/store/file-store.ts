import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { emptyDb, type PortalDb } from "./types";

/**
 * JSON-file store for local development and demos. Single-process only:
 * writes are serialised through an in-memory queue and replaced atomically.
 * Swap for a database before running more than one portal instance.
 */
export class FileStore {
  private db: PortalDb | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  private load(): PortalDb {
    if (this.db) return this.db;
    if (existsSync(this.file)) {
      this.db = { ...emptyDb(), ...(JSON.parse(readFileSync(this.file, "utf8")) as Partial<PortalDb>) };
    } else {
      this.db = emptyDb();
    }
    return this.db;
  }

  private persist() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.db, null, 2), { mode: 0o600 });
    renameSync(tmp, this.file);
  }

  /** Read-only snapshot access. */
  read<T>(fn: (db: PortalDb) => T): T {
    return fn(this.load());
  }

  /** Mutations are serialised so concurrent requests cannot interleave writes. */
  write<T>(fn: (db: PortalDb) => T): Promise<T> {
    const run = this.queue.then(() => {
      const db = this.load();
      const result = fn(db);
      this.persist();
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
