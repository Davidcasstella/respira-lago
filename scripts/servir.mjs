/* Servidor estático mínimo para desarrollo: npm run dev → http://localhost:8000
   Sirve la carpeta frontend/ con los tipos MIME correctos (incluido .glb). */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("../frontend/", import.meta.url)));
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary", ".md": "text/markdown; charset=utf-8"
};

export function servir(puerto = Number(process.env.PORT) || 8000) {
  const servidor = createServer(async (req, res) => {
    try {
      let ruta = normalize(decodeURIComponent(new URL(req.url, "http://local").pathname));
      if (ruta.endsWith("/")) ruta += "index.html";
      const archivo = join(RAIZ, ruta);
      if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }   // nada fuera de frontend/
      if (!(await stat(archivo)).isFile()) throw new Error("no es archivo");
      res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(await readFile(archivo));
    } catch { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado"); }
  });
  return new Promise(r => servidor.listen(puerto, () => r(servidor)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await servir();
  console.log(`Respira en http://localhost:${s.address().port}  (Ctrl+C para salir)`);
}
