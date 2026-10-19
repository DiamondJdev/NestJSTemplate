import { ValueTransformer } from "typeorm";
import * as crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:";
const IV_BYTES = 12;

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32)
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

/**
 * Called at boot so a missing or malformed key stops startup instead of
 * causing a 500 on the first request that touches an encrypted column.
 */
export function assertEncryptionKeyConfigured(): void {
  getKey();
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

function decrypt(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [, ivHex, tagHex, ctHex] = stored.split(":");
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export const tokenEncryptionTransformer: ValueTransformer = {
  to: (value: string | null | undefined) =>
    value !== null && value !== undefined ? encrypt(value) : value,
  from: (value: string | null | undefined) =>
    value !== null && value !== undefined ? decrypt(value) : value,
};
