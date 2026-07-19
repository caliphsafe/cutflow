import crypto from "node:crypto";

function encryptionKey() {
  const raw = process.env.PAYMENT_TOKEN_ENCRYPTION_KEY || "";
  if (!raw) throw new Error("PAYMENT_TOKEN_ENCRYPTION_KEY is not configured.");
  const isHex = /^[0-9a-f]{64}$/i.test(raw);
  const key = isHex ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PAYMENT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return "";
  const [ivPart, tagPart, ciphertextPart] = value.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error("Encrypted secret is malformed.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
