import "server-only";
import path from "node:path";
import { env } from "../env";
import { randomId } from "../crypto";
import { FileStore } from "./file-store";
import type { AuditEvent, PortalDb } from "./types";

export * from "./types";

/**
 * Single access point for persistence. Today: JSON file. To move to a database,
 * implement the same read/write contract (or replace the repository functions
 * in src/lib/services with SQL) — nothing in the UI touches storage directly.
 */
const globalForStore = globalThis as unknown as { __portalStore?: FileStore };

export const store: FileStore =
  globalForStore.__portalStore ?? (globalForStore.__portalStore = new FileStore(path.resolve(process.cwd(), env.STORE_FILE_PATH)));

export const now = () => new Date().toISOString();

export function audit(db: PortalDb, e: Omit<AuditEvent, "id" | "createdAt">) {
  db.audit.push({ ...e, id: randomId("evt"), createdAt: now() });
  if (db.audit.length > 5000) db.audit.splice(0, db.audit.length - 5000);
}

/** Keep logs bounded in the file store. */
export function trim<T>(arr: T[], max: number) {
  if (arr.length > max) arr.splice(0, arr.length - max);
}
