// Local-only admin for the reverse-image-search library. Run `npm run library-admin`,
// open the printed URL, and each "Add to Library" will:
//   1. copy the preview image into public/previews/
//   2. append the entry to scripts/rawLibrary.json
//   3. run scripts/generateIndex.mjs so public/indexedLibrary.json is updated
// The server binds to 127.0.0.1 and is not part of the Next.js build.
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 4321;
const HOST = "127.0.0.1";
const ORIGIN = `http://localhost:${PORT}`;
const CATEGORIES = ["Interior", "Exterior", "3D Asset", "Texture"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewsDir = path.join(rootDir, "public", "previews");
const rawLibraryPath = path.join(rootDir, "scripts", "rawLibrary.json");
const indexScriptPath = path.join(rootDir, "scripts", "generateIndex.mjs");

async function readLibrary() {
  if (!existsSync(rawLibraryPath)) return [];
  const items = JSON.parse(await readFile(rawLibraryPath, "utf8"));
  if (!Array.isArray(items)) throw new Error("rawLibrary.json must contain an array");
  return items;
}

function nextItemId(items) {
  const max = items.reduce((n, item) => {
    const match = /^item-(\d+)$/.exec(item.id ?? "");
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `item-${String(max + 1).padStart(3, "0")}`;
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 60) || "preview"
  );
}

function runIndexer() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [indexScriptPath], { cwd: rootDir });
    let log = "";
    child.stdout.on("data", (chunk) => (log += chunk));
    child.stderr.on("data", (chunk) => (log += chunk));
    child.on("error", (err) => resolve({ ok: false, log: log + err.message }));
    child.on("close", (code) => resolve({ ok: code === 0, log }));
  });
}

async function addItem(form) {
  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const downloadUrl = String(form.get("downloadUrl") ?? "").trim();
  const image = form.get("image");

  if (!title) throw new HttpError(400, "Title is required");
  if (!CATEGORIES.includes(category)) throw new HttpError(400, `Category must be one of: ${CATEGORIES.join(", ")}`);
  let parsedUrl;
  try {
    parsedUrl = new URL(downloadUrl);
  } catch {
    throw new HttpError(400, "Download URL is not a valid URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new HttpError(400, "Download URL must start with http(s)://");
  if (!(image instanceof File) || image.size === 0) throw new HttpError(400, "Choose a preview image");
  const ext = EXTENSIONS[image.type];
  if (!ext) throw new HttpError(400, `Unsupported image type: ${image.type || "unknown"}`);
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(400, "Image is larger than 15 MB");

  const items = await readLibrary();
  const id = nextItemId(items);
  const fileName = `${id}-${slugify(title)}${ext}`;

  await mkdir(previewsDir, { recursive: true });
  await writeFile(path.join(previewsDir, fileName), Buffer.from(await image.arrayBuffer()));

  const item = { id, title, category, previewUrl: `/previews/${fileName}`, downloadUrl };
  items.push(item);
  await writeFile(rawLibraryPath, JSON.stringify(items, null, 2) + "\n");

  const index = await runIndexer();
  return { item, indexed: index.ok, log: index.log };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// One add at a time so concurrent submits can't clobber rawLibrary.json.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function handle(req, res) {
  // Reject other hostnames (DNS rebinding) and cross-site form posts.
  const host = req.headers.host ?? "";
  if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) {
    return sendJson(res, 403, { error: "Forbidden host" });
  }
  const url = new URL(req.url, `http://${host}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(PAGE_HTML);
  }

  if (req.method === "GET" && url.pathname === "/api/library") {
    return sendJson(res, 200, { items: await readLibrary(), categories: CATEGORIES });
  }

  // Serve library preview images (public/ only) for the list on the admin page.
  if (req.method === "GET" && url.pathname.startsWith("/public/")) {
    const publicDir = path.join(rootDir, "public");
    const filePath = path.resolve(publicDir, decodeURIComponent(url.pathname.slice("/public/".length)));
    if (!filePath.startsWith(publicDir + path.sep) || !existsSync(filePath)) {
      res.writeHead(404);
      return res.end();
    }
    const type = Object.keys(EXTENSIONS).find((t) => EXTENSIONS[t] === path.extname(filePath).toLowerCase());
    res.writeHead(200, { "Content-Type": type ?? "image/jpeg", "Cache-Control": "no-store" });
    return createReadStream(filePath).pipe(res);
  }

  if (req.method === "POST" && url.pathname === "/api/add") {
    const origin = req.headers.origin;
    if (origin !== ORIGIN && origin !== `http://127.0.0.1:${PORT}`) {
      return sendJson(res, 403, { error: "Forbidden origin" });
    }
    const request = new Request(`${ORIGIN}${req.url}`, {
      method: "POST",
      headers: req.headers,
      body: req,
      duplex: "half",
    });
    const form = await request.formData();
    const result = await enqueue(() => addItem(form));
    return sendJson(res, 200, result);
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: err.message });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Library admin running at ${ORIGIN}  (Ctrl+C to stop)`);
});

const PAGE_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Library Admin</title>
<style>
  :root { --bg:#0A0A0B; --card:#111113; --raised:#191A1D; --line:#33353A; --muted:#8A8D93; --text:#D4D5D8; --accent:#9BB84A; --accent-dim:#7B9639; --danger:#f87171; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, sans-serif; }
  main { max-width:1040px; margin:0 auto; padding:40px 16px; display:grid; gap:24px; grid-template-columns:minmax(0,1fr); }
  @media (min-width: 860px) { main { grid-template-columns: 420px minmax(0,1fr); } }
  h1 { font-size:22px; margin:0 0 4px; } h2 { font-size:16px; margin:0 0 12px; }
  p.sub { margin:0; color:var(--muted); }
  header { grid-column:1/-1; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:20px; }
  form { display:grid; gap:14px; }
  label { display:grid; gap:6px; font-weight:500; }
  input[type=text], input[type=url], select { width:100%; background:var(--raised); color:var(--text); border:1px solid var(--line); border-radius:10px; padding:10px 12px; font:inherit; }
  input:focus, select:focus { outline:none; border-color:var(--accent); }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:180px; border:2px dashed var(--line); border-radius:14px; background:var(--raised); overflow:hidden; cursor:pointer; text-align:center; color:var(--muted); }
  .drop.over { border-color:var(--accent); }
  .drop img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:var(--raised); }
  .drop input { position:absolute; inset:0; opacity:0; cursor:pointer; }
  .pills { display:flex; flex-wrap:wrap; gap:8px; }
  .pills label { display:block; }
  .pills input { position:absolute; opacity:0; }
  .pills span { display:inline-block; padding:6px 14px; border:1px solid var(--line); border-radius:999px; cursor:pointer; font-weight:500; }
  .pills input:checked + span { background:var(--accent); border-color:var(--accent); color:var(--bg); }
  .pills input:focus-visible + span { outline:2px solid var(--accent); outline-offset:2px; }
  button { background:var(--accent); color:var(--bg); border:0; border-radius:10px; padding:12px; font:inherit; font-weight:600; cursor:pointer; }
  button:hover { background:var(--accent-dim); } button:disabled { opacity:.6; cursor:wait; }
  .status { min-height:20px; font-weight:500; } .status.ok { color:var(--accent); } .status.err { color:var(--danger); }
  pre { margin:0; max-height:200px; overflow:auto; background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:10px; font-size:12px; white-space:pre-wrap; color:var(--muted); }
  pre:empty { display:none; }
  .list { display:grid; gap:10px; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); }
  .item { background:var(--raised); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  .item img { display:block; width:100%; aspect-ratio:4/3; object-fit:cover; background:var(--bg); }
  .item div { padding:8px 10px; } .item small { color:var(--muted); display:block; }
  .item strong { display:block; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Library Admin</h1>
    <p class="sub">Local only. Added items are copied to public/previews/, saved to scripts/rawLibrary.json and indexed right away.</p>
  </header>

  <section class="card">
    <h2>Add an item</h2>
    <form id="form">
      <div class="drop" id="drop">
        <span id="dropText">Drop a preview image or click to choose</span>
        <img id="preview" alt="" hidden>
        <input type="file" name="image" id="image" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required>
      </div>
      <label>Title <input type="text" name="title" required maxlength="200" placeholder="Modern Sofa Set"></label>
      <div>
        <div style="font-weight:500;margin-bottom:6px">Category</div>
        <div class="pills" id="categories"></div>
      </div>
      <label>Download URL <input type="url" name="downloadUrl" required placeholder="https://drive.google.com/..."></label>
      <button type="submit" id="submit">Add to Library</button>
      <div class="status" id="status" role="status" aria-live="polite"></div>
      <pre id="log"></pre>
    </form>
  </section>

  <section class="card">
    <h2 id="listTitle">Library</h2>
    <div class="list" id="list"></div>
  </section>
</main>
<script>
  const form = document.getElementById("form");
  const imageInput = document.getElementById("image");
  const preview = document.getElementById("preview");
  const drop = document.getElementById("drop");
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const submit = document.getElementById("submit");

  function setStatus(text, kind) { statusEl.textContent = text; statusEl.className = "status " + (kind || ""); }

  function showPreview() {
    const file = imageInput.files[0];
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.hidden = !file;
    if (file) preview.src = URL.createObjectURL(file);
  }
  imageInput.addEventListener("change", showPreview);
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, () => drop.classList.add("over")));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("over")));

  async function loadLibrary() {
    const { items, categories } = await fetch("/api/library").then((r) => r.json());
    const pills = document.getElementById("categories");
    if (!pills.children.length) {
      categories.forEach((c, i) => {
        const label = document.createElement("label");
        label.innerHTML = '<input type="radio" name="category" required><span></span>';
        label.querySelector("input").value = c;
        label.querySelector("input").checked = i === 0;
        label.querySelector("span").textContent = c;
        pills.append(label);
      });
    }
    document.getElementById("listTitle").textContent = "Library (" + items.length + ")";
    const list = document.getElementById("list");
    list.replaceChildren(...items.slice().reverse().map((item) => {
      const el = document.createElement("article");
      el.className = "item";
      el.innerHTML = '<img loading="lazy" alt=""><div><strong></strong><small></small></div>';
      const src = /^https?:/i.test(item.previewUrl) ? item.previewUrl : "/public" + item.previewUrl;
      el.querySelector("img").src = src;
      el.querySelector("strong").textContent = item.title;
      el.querySelector("strong").title = item.title;
      el.querySelector("small").textContent = item.id + " · " + item.category;
      return el;
    }));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submit.disabled = true;
    logEl.textContent = "";
    setStatus("Adding and indexing… (first run loads the CLIP model)");
    try {
      const res = await fetch("/api/add", { method: "POST", body: new FormData(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      logEl.textContent = data.log.trim();
      if (data.indexed) {
        setStatus("Added " + data.item.id + " and indexed. It's live in search now.", "ok");
      } else {
        setStatus("Added " + data.item.id + ", but indexing failed. See the log, fix the issue, then run npm run index-images.", "err");
      }
      const category = form.category.value;
      form.reset();
      form.category.value = category;
      showPreview();
      await loadLibrary();
    } catch (err) {
      setStatus(err.message, "err");
    } finally {
      submit.disabled = false;
    }
  });

  loadLibrary().catch((err) => setStatus("Could not load library: " + err.message, "err"));
</script>
</body>
</html>`;
