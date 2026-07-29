// insomnia GSI listener — ловит стейт доты в реалтайме и показывает, ЧТО Valve реально отдаёт.
// Задача теста: увидеть, есть ли в GSI глиф/скан/постройки и КТО их нажал.
// Чистый Node, без зависимостей. Запуск: node server.js
const fs = require("fs");
const http = require("http");
const os = require("os");
const PORT = 3000;

let lastLog = 0;
const glyphScanSnapshot = new Map();
const HUNT = ["glyph", "scan", "fort", "building", "tower", "barrack", "rax", "cooldown"];

function isNonEmpty(value) {
  if (value == null) return false;
  if (typeof value === "string" || Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function appendJsonLine(filename, value) {
  fs.appendFileSync(__dirname + "/" + filename, JSON.stringify(value) + "\n");
}

function findGlyphScanValues(value, path = "", found = new Map()) {
  if (value == null || typeof value !== "object") return found;

  if (Array.isArray(value)) {
    value.forEach((item, index) => findGlyphScanValues(item, path + "[" + index + "]", found));
    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? path + "." + key : key;
    if (/glyph|scan/i.test(key)) found.set(childPath, child);
    findGlyphScanValues(child, childPath, found);
  }

  return found;
}

http
  .createServer((req, res) => {
    if (req.method !== "POST") {
      res.end("insomnia GSI listener alive");
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.writeHead(200);
      res.end();
      let s;
      try {
        s = JSON.parse(body);
      } catch (e) {
        console.log("parse error:", e.message);
        return;
      }
      const now = Date.now();

      // сохраняем каждый полный стейт до любого троттлинга — потом изучишь спокойно
      fs.writeFileSync(__dirname + "/last-state.json", JSON.stringify(s, null, 2));

      const shouldLogUpdate = now - lastLog >= 1000;
      if (shouldLogUpdate) {
        lastLog = now;
        console.clear();
      }

      if (isNonEmpty(s.events)) {
        const event = { ts: now, events: s.events, map: s.map ?? null };
        appendJsonLine("events.jsonl", event);
        console.log("⚡ EVENT", JSON.stringify(event));
      }

      const glyphScanValues = findGlyphScanValues(s);
      for (const [path, value] of glyphScanValues) {
        const seenBefore = glyphScanSnapshot.has(path);
        const oldValue = seenBefore ? glyphScanSnapshot.get(path) : null;
        if (!seenBefore || JSON.stringify(oldValue) !== JSON.stringify(value)) {
          const change = { ts: now, path, old: oldValue, new: value };
          appendJsonLine("glyph-scan.jsonl", change);
          console.log("🔔", JSON.stringify(change));
        }
        glyphScanSnapshot.set(path, value);
      }

      if (!shouldLogUpdate) return; // не спамим консоль чаще раза в секунду
      console.log("=== GSI update", new Date().toLocaleTimeString(), "===");
      console.log("верхние ключи:", Object.keys(s).join(", "));

      // ищем интересные термины во всём пейлоаде
      const flat = JSON.stringify(s).toLowerCase();
      const found = HUNT.filter((k) => flat.includes(k));
      console.log("НАЙДЕНЫ термины:", found.length ? found.join(", ") : "— ничего из списка глиф/скан/постройки");

      // печатаем блоки, если пришли
      if (s.buildings) console.log("\nbuildings:\n", JSON.stringify(s.buildings, null, 2).slice(0, 2000));
      if (s.map) console.log("\nmap:\n", JSON.stringify(s.map, null, 2).slice(0, 1000));
      if (s.events) console.log("\nevents:\n", JSON.stringify(s.events, null, 2).slice(0, 1000));
      console.log("\n(полный пейлоад пишется в last-state.json)");
    });
  })
  .listen(PORT, () => {
    console.log("insomnia GSI listener на http://localhost:" + PORT + "  — жду Dota 2...\n");

    const lanAddresses = new Set();
    for (const entries of Object.values(os.networkInterfaces())) {
      for (const entry of entries || []) {
        if (!entry.internal && (entry.family === "IPv4" || entry.family === 4)) {
          lanAddresses.add(entry.address);
        }
      }
    }

    if (lanAddresses.size) {
      for (const address of lanAddresses) {
        console.log("LAN IP: " + address + " — http://" + address + ":" + PORT);
      }
    } else {
      console.log("LAN IP: не найден");
    }
  });
