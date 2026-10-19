/* ===== Calidad gráfica: alta (computador) o baja (celular y gafas autónomas) =====
   Se elige sola la primera vez y la persona la puede cambiar en la pantalla de inicio.
   También se puede forzar con ?calidad=alta o ?calidad=baja en la dirección. */
const CLAVE = "respira-calidad";
const ligero = matchMedia("(pointer: coarse)").matches || /Mobi|Android|iPhone|iPad|OculusBrowser|Quest|Pico/i.test(navigator.userAgent);

function leer() {
  const p = new URLSearchParams(location.search).get("calidad");
  if (p === "alta" || p === "baja") return p;
  try { const g = localStorage.getItem(CLAVE); if (g === "alta" || g === "baja") return g; } catch (e) {}
  return ligero ? "baja" : "alta";
}

export const nivel = leer();
export function guardarCalidad(n) { try { localStorage.setItem(CLAVE, n); } catch (e) {} }

const PERFILES = {
  alta: {
    pixelRatio: Math.min(devicePixelRatio, 2), antialias: true,
    sombras: true, sombraTam: 2048,
    terrenoSeg: 220, aguaReflejo: true,
    arboles: 1100, arbustos: 180, helechos: 240, rocas: 150, troncos: 18,
    pasto: 36000, pastoRadio: 70,
    luciernagas: 260, polen: 500,
    flores: 900, hongos: 90, zorros: 4, bandadas: 3, peces: 3, mariposas: 40,
    niebla: 0.0085, xrEscala: 1
  },
  baja: {
    pixelRatio: Math.min(devicePixelRatio, 1.25), antialias: false,
    sombras: false, sombraTam: 1024,
    terrenoSeg: 120, aguaReflejo: false,
    arboles: 380, arbustos: 70, helechos: 90, rocas: 70, troncos: 8,
    pasto: 7000, pastoRadio: 40,
    luciernagas: 110, polen: 160,
    flores: 300, hongos: 30, zorros: 2, bandadas: 2, peces: 2, mariposas: 16,
    niebla: 0.013, xrEscala: 0.8
  }
};

export const Q = PERFILES[nivel];
