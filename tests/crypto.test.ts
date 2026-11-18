import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptSecret, encryptSecret, hashPassword, signToken, verifyPassword, verifyToken } from "../src/lib/crypto";

test("password hashing round-trips and rejects wrong passwords", async () => {
  const h = await hashPassword("correct horse 42");
  assert.ok(h.startsWith("scrypt$"));
  assert.equal(await verifyPassword("correct horse 42", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});

test("signed tokens detect tampering", () => {
  const t = signToken({ uid: "u1" }, "secret");
  assert.deepEqual(verifyToken(t, "secret"), { uid: "u1" });
  assert.equal(verifyToken(t, "other"), null);
  const [body, mac] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ uid: "admin" })).toString("base64url");
  assert.equal(verifyToken(`${forged}.${mac}`, "secret"), null);
  assert.equal(verifyToken(`${body}.`, "secret"), null);
});

test("secrets are encrypted with AES-GCM and authenticated", () => {
  const blob = encryptSecret("sk_test_abc", "k".repeat(40));
  assert.notEqual(blob, "sk_test_abc");
  assert.equal(decryptSecret(blob, "k".repeat(40)), "sk_test_abc");
  assert.throws(() => decryptSecret(blob, "other-key"));
});
