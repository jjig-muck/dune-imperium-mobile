import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/__mobile") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(
        '<!doctype html><html><head><title>390px mobile QA</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#080e0a;margin:0;display:flex;justify-content:center}iframe{width:390px;max-width:100vw;height:100vh;border:0;box-shadow:0 0 0 1px #cdb27a33}</style></head><body><iframe title="390px 모바일 화면 검증" src="/"></iframe></body></html>',
      );
      return;
    }
    const file = resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(4173, "0.0.0.0", () => console.log("Local: http://localhost:4173"));
