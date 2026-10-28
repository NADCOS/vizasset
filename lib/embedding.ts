// CLIP image embeddings are stored and sent as base64: a little-endian float32 scale followed by
// EMBEDDING_DIM int16 values (value = int16 * scale). That's about a third of the size of a
// JSON number array, with the same precision as the 5 decimals the index used before.
// int16 rather than int8: CLIP vectors have a few large outlier dimensions, which would leave
// int8 almost no resolution for the rest.
export const EMBEDDING_DIM = 512;
const BYTES = 4 + EMBEDDING_DIM * 2;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(encoded: string): Uint8Array | null {
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function encodeEmbedding(vector: ArrayLike<number>): string {
  if (vector.length !== EMBEDDING_DIM) throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${vector.length}`);
  let max = 0;
  for (let i = 0; i < vector.length; i++) max = Math.max(max, Math.abs(vector[i]));
  const scale = max / 32767 || 1;
  const view = new DataView(new ArrayBuffer(BYTES));
  view.setFloat32(0, scale, true);
  for (let i = 0; i < vector.length; i++) {
    view.setInt16(4 + i * 2, Math.max(-32767, Math.min(32767, Math.round(vector[i] / scale))), true);
  }
  return bytesToBase64(new Uint8Array(view.buffer));
}

/** Returns null for anything that isn't a well-formed, unit-length embedding. */
export function decodeEmbedding(encoded: string): Float32Array | null {
  const bytes = typeof encoded === "string" ? base64ToBytes(encoded) : null;
  if (!bytes || bytes.length !== BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const scale = view.getFloat32(0, true);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const out = new Float32Array(EMBEDDING_DIM);
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    out[i] = view.getInt16(4 + i * 2, true) * scale;
    norm += out[i] * out[i];
  }
  return Math.abs(Math.sqrt(norm) - 1) < 0.05 ? out : null;
}
