import { assertEncryptionKeyConfigured } from "./token-encryption.transformer";

describe("assertEncryptionKeyConfigured", () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = original;
  });

  it("throws when the key is missing", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => assertEncryptionKeyConfigured()).toThrow(/not set/);
  });

  it("throws when the key is not 32 bytes of hex", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "too-short";
    expect(() => assertEncryptionKeyConfigured()).toThrow(/32 bytes/);
  });

  it("passes with a valid 64-char hex key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    expect(() => assertEncryptionKeyConfigured()).not.toThrow();
  });
});
