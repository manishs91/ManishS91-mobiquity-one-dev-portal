import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/* ---------------------------- passwords (scrypt) --------------------------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, , saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ------------------------------ signed tokens ------------------------------ */

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Compact signed token: base64url(json).base64url(hmac). Not encrypted — never put secrets in it. */
export function signToken(payload: object, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyToken<T>(token: string | undefined, secret: string): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/* --------------------------- secrets at rest (AES) -------------------------- */

function keyFrom(secret: string): Buffer {
  const decoded = Buffer.from(secret, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plaintext: string, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(key), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ct].map((x) => (typeof x === "string" ? x : x.toString("base64url"))).join(".");
}

export function decryptSecret(blob: string, key: string): string {
  const [v, iv, tag, ct] = blob.split(".");
  if (v !== "v1") throw new Error("Unknown secret format");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(key), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/* --------------------------------- misc ---------------------------------- */

export function randomId(prefix: string, bytes = 9): string {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

export function randomSecret(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(n: number): string {
  let s = "";
  while (s.length < n) s += randomBytes(8).readBigUInt64BE().toString().slice(1);
  return s.slice(0, n);
}

/** Show only the last 4 characters of a secret. */
export function mask(secret: string): string {
  return secret.length <= 4 ? "••••" : `${"•".repeat(Math.min(12, secret.length - 4))}${secret.slice(-4)}`;
}
