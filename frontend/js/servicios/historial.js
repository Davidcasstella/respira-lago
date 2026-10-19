/* ===== Historial de sesiones =====
   Hoy se guarda solo en este navegador (localStorage). Toda la app pasa por este módulo,
   así que conectar el backend más adelante (backend/, POST /api/sesiones) solo cambia este archivo.

   Registro: { t: fecha en ms, pre: 0–10, post: 0–10, min: duración en minutos } */
const CLAVE = "respira-hist", MAXIMO = 30;

function leer() {
  try { const h = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(h) ? h : []; }
  catch (e) { return []; }
}

export const historial = {
  /** Las últimas `n` sesiones, de la más reciente a la más antigua. */
  ultimas(n = 4) { return leer().slice(-n).reverse(); },

  /** Guarda una sesión; conserva solo las últimas 30. */
  guardar({ pre, post, min }) {
    const h = leer(); h.push({ t: Date.now(), pre, post, min });
    try { localStorage.setItem(CLAVE, JSON.stringify(h.slice(-MAXIMO))); } catch (e) { /* modo privado: no se guarda */ }
  }
};
