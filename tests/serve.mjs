// Servidor estático mínimo para os testes do Playwright (sem dependências extras).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(import.meta.dirname, "..");
const types = {
	".html": "text/html; charset=utf-8",
	".css": "text/css",
	".js": "text/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".pdf": "application/pdf",
};

createServer(async (req, res) => {
	const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
	try {
		const body = await readFile(join(root, path || "index.html"));
		res.writeHead(200, { "content-type": types[extname(path || "index.html").toLowerCase()] ?? "application/octet-stream" });
		res.end(body);
	} catch {
		res.writeHead(404).end("not found");
	}
}).listen(Number(process.env.PORT) || 4173);
