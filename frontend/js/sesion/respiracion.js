/* ===== Ritmo de la respiración: funciones puras, sin DOM ni Three.js =====
   Se pueden probar en Node (ver tests/respiracion.test.js). El protocolo se pasa como
   argumento para no depender de la variable global PROTOCOL. */

/** Segundos que dura un ciclo completo (toma aire + sostén + suelta + descansa). */
export const duracionCiclo = p => p.inhale + p.hold + p.exhale + p.rest;

/**
 * Fase en el segundo `t` de la sesión.
 * @returns {[fase: "inhale"|"hold"|"exhale"|"rest", lleno: number, restante: number]}
 *   `lleno` va de 0 (pulmones vacíos) a 1 (llenos); `restante` son los segundos que le quedan a la fase.
 */
export function faseEn(t, p) {
  let c = t % duracionCiclo(p);
  if (c < p.inhale) return ["inhale", c / p.inhale, p.inhale - c];
  c -= p.inhale; if (c < p.hold) return ["hold", 1, p.hold - c];
  c -= p.hold; if (c < p.exhale) return ["exhale", 1 - c / p.exhale, p.exhale - c];
  c -= p.exhale; return ["rest", 0, p.rest - c];
}

/** Curva suave (coseno) para que la guía no se mueva a saltos. */
export const suavizar = x => 0.5 - 0.5 * Math.cos(Math.PI * x);

/** 125 → "2:05" */
export function formatoTiempo(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
