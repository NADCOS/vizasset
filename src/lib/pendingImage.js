// Hands an image picked in the site header over to the search page across a page load.
// The image is downscaled first (the model only looks at 224x224) so it fits in sessionStorage.
const STORAGE_KEY = "vizassets:pending-image";
const MAX_SIDE = 512;

export async function savePendingImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  sessionStorage.setItem(STORAGE_KEY, canvas.toDataURL("image/jpeg", 0.9));
}

// Returns the pending image as a File and clears it, or null when there is none.
export async function takePendingImage() {
  let dataUrl = null;
  try {
    dataUrl = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!dataUrl) return null;
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], "search-image.jpg", { type: blob.type });
}
