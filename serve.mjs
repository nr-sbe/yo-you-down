// Dependency-free development server. Serves only the public app files.
import http from "node:http";
import { readFile } from "node:fs/promises";
const root = new URL("./", import.meta.url);
const files = new Set([
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "icons.js",
  "runtime-config.js",
  "assets/Outfit-variable.ttf",
  "domain.js",
  "data.js",
  "config.js",
  "favicon.svg",
]);
const types = { html: "text/html", css: "text/css", js: "text/javascript", svg: "image/svg+xml", ttf:'font/ttf' };
const port = Number(process.env.PORT || 4173);
http
  .createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://localhost").pathname;
      const path = pathname === "/" ? "index.html" : pathname.slice(1);
      if (!files.has(path)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const data = await readFile(new URL(path, root));
      res.writeHead(200, {
        "Content-Type": `${types[path.split(".").pop()]}; charset=utf-8`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end("Could not read file");
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Yo, You Down? → http://127.0.0.1:${port}`));
