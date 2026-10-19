/* ===== Voz guía con la síntesis de voz del navegador (Web Speech API) ===== */
const hayVoz = typeof window !== "undefined" && "speechSynthesis" in window;
let activa = true, vozEs = null;

function elegirVoz() { const v = speechSynthesis.getVoices?.() || []; vozEs = v.find(x => /^es/i.test(x.lang)) || null; }
if (hayVoz) { elegirVoz(); speechSynthesis.onvoiceschanged = elegirVoz; }

export const vozActiva = () => activa;

export function callarVoz() { if (hayVoz) try { speechSynthesis.cancel(); } catch (e) { /* sin voz no pasa nada */ } }

export function activarVoz(on) { activa = on; if (!on) callarVoz(); }

/** Dice una frase en español; corta la anterior para no acumular frases. */
export function decir(texto) {
  if (!activa || !hayVoz) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES"; if (vozEs) u.voice = vozEs;
    u.rate = 0.85; u.pitch = 0.9; u.volume = 0.8;
    speechSynthesis.speak(u);
  } catch (e) { /* algunos navegadores no tienen voces instaladas */ }
}
