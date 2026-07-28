// insomnia GSI listener — ловит стейт доты в реалтайме и показывает, ЧТО Valve реально отдаёт.
// Задача теста: увидеть, есть ли в GSI глиф/скан/постройки и КТО их нажал.
// Чистый Node, без зависимостей. Запуск: node server.js
const http = require("http");
const PORT = 3000;

let lastLog = 0;
const HUNT = ["glyph", "scan", "fort", "building", "tower", "barrack", "rax", "cooldown"];

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
      if (now - lastLog < 1000) return; // не спамим консоль чаще раза в секунду
      lastLog = now;

      console.clear();
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

      // сохраняем последний полный стейт в файл — потом изучишь спокойно
      require("fs").writeFileSync(__dirname + "/last-state.json", JSON.stringify(s, null, 2));
    });
  })
  .listen(PORT, () =>
    console.log("insomnia GSI listener на http://localhost:" + PORT + "  — жду Dota 2...\n")
  );
