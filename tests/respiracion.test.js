/* Pruebas del ritmo de respiración (frontend/js/sesion/respiracion.js) y del protocolo del psicólogo. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { faseEn, duracionCiclo, suavizar, formatoTiempo } from "../frontend/js/sesion/respiracion.js";

const P = { inhale: 4, hold: 1, exhale: 6, rest: 1 };

test("un ciclo dura la suma de las fases", () => assert.equal(duracionCiclo(P), 12));

test("las fases se suceden en orden y se repiten", () => {
  assert.equal(faseEn(0, P)[0], "inhale");
  assert.equal(faseEn(4.5, P)[0], "hold");
  assert.equal(faseEn(5, P)[0], "exhale");
  assert.equal(faseEn(11.5, P)[0], "rest");
  assert.equal(faseEn(12, P)[0], "inhale");
});

test("los pulmones se llenan al inhalar y se vacían al exhalar", () => {
  assert.equal(faseEn(2, P)[1], 0.5);
  assert.equal(faseEn(4.5, P)[1], 1);
  assert.equal(faseEn(8, P)[1], 0.5);
  assert.equal(faseEn(11.5, P)[1], 0);
});

test("una fase en 0 segundos se salta", () => {
  assert.equal(faseEn(4, { inhale: 4, hold: 0, exhale: 4, rest: 0 })[0], "exhale");
});

test("suavizar y formatoTiempo", () => {
  assert.equal(suavizar(0), 0); assert.equal(suavizar(1), 1); assert.ok(Math.abs(suavizar(0.5) - 0.5) < 1e-9);
  assert.equal(formatoTiempo(125), "2:05"); assert.equal(formatoTiempo(-3), "0:00");
});

test("protocolo.js (lo edita el psicólogo) es válido", () => {
  // Se ejecuta como script clásico, igual que en el navegador
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("../frontend/js/protocolo.js", import.meta.url), "utf8") + "\n;globalThis.P = PROTOCOL; globalThis.W = WORDS;", ctx);
  const { P: proto, W: palabras } = ctx;
  for (const f of ["inhale", "hold", "exhale", "rest"]) {
    assert.ok(typeof proto[f] === "number" && proto[f] >= 0, `${f} debe ser un número ≥ 0`);
    assert.ok(Array.isArray(proto.cues[f]) && proto.cues[f].length === 2, `cues.${f} debe tener [título, frase]`);
  }
  assert.ok(proto.inhale > 0 && proto.exhale > 0, "inhale y exhale no pueden ser 0");
  assert.equal(palabras.length, 11, "WORDS debe tener 11 palabras (0 a 10)");
});
