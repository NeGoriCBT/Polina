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

const FEELING_OPTIONS = [
  "Вдохновение",
  "Радость",
  "Умиротворение",
  "Интерес",
  "Спокойствие",
  "Равнодушие",
  "Грусть",
  "Тревога",
  "Раздражение",
];
/** Chronological survey order; `image` = tree-N.jpg slot. */
const STYLES = [
  { name: "Ренессанс", year: "~1400", image: 1 },
  { name: "Барокко", year: "~1600", image: 2 },
  { name: "Рококо", year: "~1730", image: 3 },
  { name: "Классицизм", year: "~1750", image: 4 },
  { name: "Романтизм", year: "~1820", image: 17 },
  { name: "Импрессионизм", year: "~1874", image: 5 },
  { name: "Фовизм", year: "~1905", image: 6 },
  { name: "Экспрессионизм", year: "~1905", image: 7 },
  { name: "Кубизм", year: "~1907", image: 8 },
  { name: "Авангардизм", year: "~1910", image: 9 },
  { name: "Абстракционизм", year: "~1910", image: 10 },
  { name: "Супрематизм", year: "~1915", image: 11 },
  { name: "Дадаизм", year: "~1916", image: 12 },
  { name: "Сюрреализм", year: "~1924", image: 13 },
  { name: "Активная живопись", year: "~1945", image: 14 },
  { name: "Минимализм", year: "~1960", image: 15 },
  { name: "Поп-арт", year: "~1962", image: 16 },
  { name: "Постмодернизм", year: "~1980", image: 18 },
];
const SLIDES = STYLES.map((style) => ({
  image: style.image,
  name: style.name,
  year: style.year,
  label: `${style.name} ${style.year}`,
  id: "feeling",
  text: "Что вы чувствуете в первую очередь?",
  options: FEELING_OPTIONS,
}));
const SLIDE_COUNT = SLIDES.length;

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
    Number(sub.schema) === 8 &&
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
      const idx = SLIDES.findIndex((s) => s.image === Number(row.image));
      if (idx < 0) continue;
      const slide = SLIDES[idx];
      if (row.id !== slide.id) continue;
      const val = row.value;
      if (typeof val === "string" && Object.prototype.hasOwnProperty.call(images[idx].counts, val)) {
        images[idx].counts[val] += 1;
      }
    }
  }

  return {
    schema: 8,
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

function safeJoin(root, rel) {
  const resolved = path.normalize(path.join(root, rel));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function serveFile(res, filePath) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return send(res, 404, { error: "not found" });
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : "public, max-age=3600",
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
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
        schema: 8,
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
      const rel = pathname.replace(/^\//, "") || "index.html";
      const file = safeJoin(ROOT, rel);
      if (file) return serveFile(res, file);
      const pub = safeJoin(path.join(ROOT, "public"), rel);
      if (pub) return serveFile(res, pub);
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: "server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Survey: http://127.0.0.1:${PORT}`);
  console.log(`Картинки: ${IMAGES} (tree-1.jpg … tree-18.jpg)`);
});
