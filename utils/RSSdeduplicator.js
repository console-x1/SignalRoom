import crypto from "crypto"

const cache = new Map();
const TTL = 1000 * 60 * 60 * 12;

export function generateHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function isDuplicate(hash) {
  const now = Date.now();

  for (const [key, value] of cache.entries()) {
    if (now - value > TTL) {
      cache.delete(key);
    }
  }

  if (cache.has(hash)) {
    return true;
  }

  cache.set(hash, now);
  return false;
}