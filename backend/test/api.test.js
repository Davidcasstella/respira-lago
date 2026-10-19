import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { crearApp } from "../src/app.js";
import { crearAlmacenMemoria } from "../src/almacen/memoria.js";

let servidor, base;
before(async () => {
  servidor = createServer(crearApp({ almacen: crearAlmacenMemoria(), config: { origenPermitido: "*", limiteCuerpo: 1024 } }));
  await new Promise(r => servidor.listen(0, r));
  base = `http://localhost:${servidor.address().port}/api`;
});
after(() => servidor.close());

const enviar = (cuerpo, tipo = "application/json") =>
  fetch(`${base}/sesiones`, { method: "POST", headers: { "Content-Type": tipo }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });

test("GET /api/salud responde ok", async () => {
  const r = await fetch(`${base}/salud`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

test("POST /api/sesiones guarda una sesión válida y GET la lista", async () => {
  const r = await enviar({ pre: 7, post: 3, min: 3 });
  assert.equal(r.status, 201);
  const { sesion } = await r.json();
  assert.equal(sesion.pre, 7); assert.equal(sesion.post, 3); assert.ok(sesion.id);
  const lista = await (await fetch(`${base}/sesiones`)).json();
  assert.equal(lista.sesiones[0].id, sesion.id);
});

test("POST /api/sesiones rechaza datos fuera de rango", async () => {
  const r = await enviar({ pre: 11, post: -1, min: 0 });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).detalles.length, 3);
});

test("POST /api/sesiones rechaza JSON mal formado y otro Content-Type", async () => {
  assert.equal((await enviar("{no es json")).status, 400);
  assert.equal((await enviar("pre=1", "text/plain")).status, 415);
});

test("POST /api/sesiones rechaza cuerpos demasiado grandes", async () => {
  assert.equal((await enviar({ pre: 1, post: 1, min: 1, relleno: "x".repeat(5000) })).status, 413);
});

test("rutas desconocidas dan 404", async () => {
  assert.equal((await fetch(`${base}/nada`)).status, 404);
});
