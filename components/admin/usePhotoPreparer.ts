"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeEmbedding } from "@/lib/embedding";
import type { PreparedPhoto } from "@/lib/adminApi";

const MAX_SIZE = 1024;

// Shrinks big renders before upload so previews load fast on the search page.
async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image"))), "image/webp", 0.85)
  );
}

type Pending = { resolve: (embedding: number[]) => void; reject: (err: Error) => void };

/**
 * Turns a dropped photo into what the library needs: a shrunk image plus its CLIP embedding,
 * computed in the browser with the same worker the search page uses. The AI model downloads
 * once (cached by the browser); modelProgress is its download percentage while that happens.
 */
export function usePhotoPreparer() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextIdRef = useRef(0);
  const [modelProgress, setModelProgress] = useState<number | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../../src/workers/imageSearchWorker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.status === "downloading_model") return setModelProgress(data.progress);
      if (data.status === "ready") return setModelProgress(null);
      const pending = pendingRef.current.get(data.id);
      if (!pending) return;
      pendingRef.current.delete(data.id);
      if (data.status === "complete") pending.resolve(data.embedding);
      else if (data.status === "error") pending.reject(new Error(data.error));
    };
    worker.onerror = (event) => {
      const err = new Error(event.message || "The AI engine failed to start");
      pendingRef.current.forEach((p) => p.reject(err));
      pendingRef.current.clear();
      worker.terminate();
      workerRef.current = null;
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const prepare = useCallback(
    async (file: Blob): Promise<PreparedPhoto> => {
      const image = await shrinkImage(file);
      const id = ++nextIdRef.current;
      const vector = await new Promise<number[]>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        getWorker().postMessage({ type: "embed", id, image });
      });
      return { image, embedding: encodeEmbedding(vector) };
    },
    [getWorker]
  );

  return { prepare, modelProgress };
}
