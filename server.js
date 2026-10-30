"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 3847;
const ROOT = __dirname;
const IMAGES = path.join(ROOT, "images");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");
// Static site lives at repo root (GitHub Pages + local npm start).

const SLIDE_COUNT = 15;

/** Same feeling question for every image (tree-1 … tree-15). */
const FEELING_OPTIONS = [
  "радость",
  "восхищение",
  "тревога",
  "изумление",
  "печаль",
  "скука",
  "отвращение",
  "гнев",
  "интерес",
];
const STYLES = [
  { name: "Ренессанс", year: "~1400" },
  { name: "Барокко", year: "~1600" },
  { name: "Рококо", year: "~1730" },
  { name: "Классицизм", year: "~1750" },
  { name: "Импрессионизм", year: "~1874" },
  { name: "Фовизм", year: "~1905" },
  { name: "Экспрессионизм", year: "~1905" },
  { name: "Кубизм", year: "~1907" },
  { name: "Авангардизм", year: "~1910" },
  { name: "Абстракционизм", year: "~1910" },
  { name: "Супрематизм", year: "~1915" },
  { name: "Дадаизм", year: "~1916" },
  { name: "Сюрреализм", year: "~1924" },
  { name: "Активная живопись", year: "~1945" },
  { name: "Минимализм", year: "~1960" },
];
const SLIDES = STYLES.map((style, i) => ({
  image: i + 1,
  name: style.name,
  year: style.year,
  label: `${style.name} ${style.year}`,
  id: "feeling",
  text: "Что вы чувствуете в первую очередь?",
  options: FEELING_OPTIONS,
}));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]\n", "utf8");
  }
}

function readSubmissions() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8").trim() || "[]";
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function appendSubmission(entry) {
  ensureDataFile();
  const list = readSubmissions();
  list.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
  return list.length;
}

function isCompleteSubmission(sub) {
  return (
    sub &&
    Number(sub.schema) === 5 &&
    Array.isArray(sub.answers) &&
    sub.answers.length === SLIDE_COUNT
  );
}

function aggregate(submissions) {
  const valid = submissions.filter(isCompleteSubmission);
  const images = SLIDES.map((slide) => ({
    image: slide.image,
    label: slide.label,
    question: { id: slide.id, text: slide.text, options: slide.options },
    counts: Object.fromEntries(slide.options.map((o) => [o, 0])),
  }));

  for (const sub of valid) {
    for (const row of sub.answers) {
      const idx = Number(row.image) - 1;
      if (idx < 0 || idx >= SLIDE_COUNT) continue;
      const slide = SLIDES[idx];
      if (row.id !== slide.id) continue;
      const val = row.value;
      if (typeof val === "string" && Object.prototype.hasOwnProperty.call(images[idx].counts, val)) {
        images[idx].counts[val] += 1;
      }
    }
  }

  return {
    schema: 5,
    totalSubmissions: valid.length,
    slides: SLIDES,
    images,
  };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": headers["Content-Type"] || "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function serveFile(res, filePath) {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, { error: "not found" });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 200_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (!Array.isArray(payload.answers) || payload.answers.length !== SLIDE_COUNT) return null;

  const answers = [];
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const slide = SLIDES[i];
    const row = payload.answers[i];
    if (!row || Number(row.image) !== slide.image) return null;
    if (row.id !== slide.id) return null;
    const val = row.value;
    if (typeof val !== "string" || !slide.options.includes(val)) return null;
    answers.push({ image: slide.image, id: slide.id, value: val });
  }
  return { answers };
}

ensureDataFile();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/stats") {
      const stats = aggregate(readSubmissions());
      return send(res, 200, stats);
    }

    if (req.method === "POST" && pathname === "/api/submit") {
      const raw = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(raw || "{}");
      } catch {
        return send(res, 400, { error: "invalid json" });
      }
      const clean = validateSubmission(parsed);
      if (!clean) return send(res, 400, { error: "invalid submission" });

      const entry = {
        schema: 5,
        submittedAt: new Date().toISOString(),
        answers: clean.answers,
      };
      const total = appendSubmission(entry);
      return send(res, 200, { ok: true, totalSubmissions: total });
    }

    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      return serveFile(res, path.join(ROOT, "index.html"));
    }

    if (req.method === "GET" && pathname.startsWith("/images/")) {
      const file = safeJoin(IMAGES, pathname.slice("/images/".length));
      return serveFile(res, file);
    }

    if (req.method === "GET") {
      // Prefer root static files; fall back to legacy public/ paths
      const rootFile = safeJoin(ROOT, pathname);
      if (rootFile && fs.existsSync(rootFile) && !fs.statSync(rootFile).isDirectory()) {
        return serveFile(res, rootFile);
      }
      const legacy = safeJoin(path.join(ROOT, "public"), pathname.replace(/^\/public/, "") || pathname);
      return serveFile(res, legacy);
    }

    send(res, 405, { error: "method not allowed" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Опрос запущен: http://127.0.0.1:${PORT}`);
  console.log(`Картинки: ${IMAGES} (tree-1.png … tree-15.png)`);
  console.log(`Данные:   ${DATA_FILE}`);
});
