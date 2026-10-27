// CLIP image-embedding worker. Messages from the main thread:
//   { type: 'load', id? }                    preload the model
//   { type: 'embed', id?, image: Blob|string } embed a Blob, data URL or URL
// Messages back (each echoes `id` when one was sent):
//   { status: 'downloading_model', file, progress, loaded, total }
//   { status: 'ready', device }
//   { status: 'complete', embedding: number[512] }
//   { status: 'error', error }
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "@huggingface/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const EMBEDDING_DIM = 512;

// Models come from the Hugging Face Hub and are cached in the browser's Cache Storage.
env.allowLocalModels = false;
env.useBrowserCache = true;

// fp32 on WebGPU; the quantized model on WASM is ~4x smaller and much faster on CPU.
const DTYPE_BY_DEVICE = { webgpu: "fp32", wasm: "q8" };

async function hasWebGPU() {
  try {
    return Boolean(self.navigator?.gpu && (await self.navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

class ImageEmbeddingPipeline {
  static instance = null;

  // Returns a shared promise so concurrent callers never trigger a second load.
  static getInstance(progressCallback) {
    if (!this.instance) {
      this.instance = this.load(progressCallback).catch((err) => {
        this.instance = null; // allow a retry after a failed load
        throw err;
      });
    }
    return this.instance;
  }

  static async load(progressCallback) {
    const devices = (await hasWebGPU()) ? ["webgpu", "wasm"] : ["wasm"];
    let lastError;

    for (const device of devices) {
      try {
        const options = { device, dtype: DTYPE_BY_DEVICE[device], progress_callback: progressCallback };
        const [processor, model] = await Promise.all([
          AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: progressCallback }),
          CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, options),
        ]);
        return { processor, model, device };
      } catch (err) {
        lastError = err;
        console.warn(`[imageSearchWorker] Failed to load model on ${device}:`, err);
      }
    }
    throw lastError;
  }
}

// Combines per-file download progress into one overall percentage.
function createProgressReporter(id) {
  const files = new Map();
  return (event) => {
    if (event.status !== "progress" && event.status !== "done") return;
    const prev = files.get(event.file) ?? { loaded: 0, total: 0 };
    files.set(event.file, {
      loaded: event.status === "done" ? prev.total || prev.loaded : event.loaded ?? prev.loaded,
      total: event.total ?? prev.total,
    });

    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    self.postMessage({
      id,
      status: "downloading_model",
      file: event.file,
      progress: total > 0 ? Math.min(100, (loaded / total) * 100) : 0,
      loaded,
      total,
    });
  };
}

async function toRawImage(image) {
  if (image instanceof Blob) return RawImage.fromBlob(image);
  if (typeof image === "string" && image.length > 0) return RawImage.read(image);
  throw new TypeError("Expected the image as a Blob, data URL or URL string");
}

function l2Normalize(vector) {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (!norm) throw new Error("Model returned a zero vector");
  return Array.from(vector, (v) => v / norm);
}

async function getPipeline(id) {
  const pipeline = await ImageEmbeddingPipeline.getInstance(createProgressReporter(id));
  self.postMessage({ id, status: "ready", device: pipeline.device });
  return pipeline;
}

self.addEventListener("message", async ({ data }) => {
  const { id, type = "embed", image } = data ?? {};

  try {
    if (type === "load") {
      await getPipeline(id);
      return;
    }
    if (type !== "embed") throw new Error(`Unknown message type: ${type}`);

    const { processor, model } = await getPipeline(id);
    const rawImage = await toRawImage(image);
    const inputs = await processor(rawImage);
    const { image_embeds } = await model(inputs);

    if (image_embeds.data.length !== EMBEDDING_DIM) {
      throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${image_embeds.data.length}`);
    }
    self.postMessage({ id, status: "complete", embedding: l2Normalize(image_embeds.data) });
  } catch (err) {
    self.postMessage({
      id,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
