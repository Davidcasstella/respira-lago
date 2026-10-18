/* ===== Sonido ambiente sintetizado: río, pájaros y un acorde que acompaña la respiración =====
   No usa archivos de audio: todo se genera con Web Audio en el navegador. */
let ac = null, master, rioG, rioPan, pad, encendido = true, temporizador = 0;

function ruido(seg, marron) {
  const n = ac.sampleRate * seg, b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let ult = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (marron) { ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w * 0.5; }
  }
  const s = ac.createBufferSource(); s.buffer = b; s.loop = true; return s;
}
function lfo(f, prof, destino) {
  const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = prof;
  o.connect(g); g.connect(destino); o.start();
}

function crearRio() {
  rioG = ac.createGain(); rioG.gain.value = 0.4;
  rioPan = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
  rioG.connect(rioPan); rioPan.connect(master);
  // Rumor grave del agua
  const grave = ruido(5, true), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
  const gG = ac.createGain(); gG.gain.value = 0.55; grave.connect(lp); lp.connect(gG); gG.connect(rioG); grave.start();
  // Burbujeo: ruido en banda media cuyo volumen y tono cambian sin parar
  for (const [f, q, v, m] of [[900, 0.9, 0.16, 0.37], [1700, 1.2, 0.09, 0.61], [2900, 1.5, 0.05, 0.83]]) {
    const s = ruido(3, false), bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    const g = ac.createGain(); g.gain.value = v;
    lfo(m, v * 0.7, g.gain); lfo(m * 1.7, f * 0.25, bp.frequency);
    s.connect(bp); bp.connect(g); g.connect(rioG); s.start();
  }
}

// Eco corto para que los pájaros suenen dentro de un bosque
let eco;
function crearEco() {
  eco = ac.createGain(); eco.gain.value = 1;
  const d = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
  d.delayTime.value = 0.21; fb.gain.value = 0.28; lp.type = "lowpass"; lp.frequency.value = 3500;
  eco.connect(master); eco.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
}
function nota(t, f0, f1, dur, vol, pan, tipo = "sine") {
  const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (p.pan) p.pan.value = pan;
  o.connect(g); g.connect(p); p.connect(eco); o.start(t); o.stop(t + dur + 0.05);
}
function cantar() {
  if (!ac) return;
  const t = ac.currentTime + 0.05, pan = Math.random() * 1.6 - 0.8, v = 0.03 + Math.random() * 0.05, tipo = Math.random();
  if (tipo < 0.4) {                    // pío-pío: notas cortas que suben
    const n = 2 + Math.floor(Math.random() * 4), f = 2600 + Math.random() * 1200;
    for (let i = 0; i < n; i++) nota(t + i * 0.13, f, f * 1.35, 0.09, v, pan);
  } else if (tipo < 0.75) {            // silbido que baja
    const f = 3000 + Math.random() * 900;
    nota(t, f, f * 0.7, 0.38, v, pan); nota(t + 0.45, f * 0.9, f * 0.62, 0.3, v * 0.8, pan);
  } else {                             // trino
    const f = 3800 + Math.random() * 800;
    for (let i = 0; i < 9; i++) nota(t + i * 0.045, f, f * (i % 2 ? 0.92 : 1.05), 0.05, v * 0.7, pan, "triangle");
  }
  temporizador = setTimeout(cantar, 900 + Math.random() * 3200);   // un bosque con vida: cantos frecuentes
}

function crearPad() {
  pad = ac.createGain(); pad.gain.value = 0.02; pad.connect(master);
  [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = (i - 2) * 3;
    const g = ac.createGain(); g.gain.value = 0.18 / (i + 1); o.connect(g); g.connect(pad); o.start();
  });
}

export function iniciarSonido() {
  if (ac) { ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(encendido ? 0.9 : 0, ac.currentTime + 3);
    crearRio(); crearEco(); crearPad();
    temporizador = setTimeout(cantar, 1200);
  } catch (e) { ac = null; }
}

export function sonidoEncendido(on) {
  encendido = on; if (!ac) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ac.currentTime + 0.8);
}
export const haySonido = () => encendido;

/** El acorde sube al tomar aire y baja al soltarlo. */
export function faseSonido(fase, segundos) {
  if (!ac || !pad) return;
  pad.gain.cancelScheduledValues(ac.currentTime);
  pad.gain.linearRampToValueAtTime(fase === "inhale" ? 0.09 : 0.02, ac.currentTime + segundos);
}

/** El río suena más fuerte cerca y del lado en que está. lado: -1 izquierda … 1 derecha. */
export function rioSonido(distancia, lado) {
  if (!ac || !rioG) return;
  const v = 0.12 + 0.6 * Math.max(0, 1 - Math.max(0, distancia - 2) / 45);
  rioG.gain.setTargetAtTime(v, ac.currentTime, 0.3);
  if (rioPan.pan) rioPan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, lado * 0.7)), ac.currentTime, 0.3);
}

/* Fogata: chasquidos cortos de ruido agudo; su volumen depende de la distancia */
let fuegoG = null, fuegoTimer = 0;
function chasquido() {
  if (!ac || !fuegoG) return;
  const t = ac.currentTime + 0.02, n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = ruido(0.08, false), hp = ac.createBiquadFilter(), g = ac.createGain(), tt = t + i * azar(0.02, 0.09);
    hp.type = "bandpass"; hp.frequency.value = azar(1800, 4200); hp.Q.value = 0.8;
    g.gain.setValueAtTime(azar(0.15, 0.5), tt); g.gain.exponentialRampToValueAtTime(0.001, tt + azar(0.02, 0.06));
    s.connect(hp); hp.connect(g); g.connect(fuegoG); s.start(tt); s.stop(tt + 0.1);
  }
  fuegoTimer = setTimeout(chasquido, azar(60, 420));
}
const azar = (a, b) => a + Math.random() * (b - a);
function crearFuego() {
  fuegoG = ac.createGain(); fuegoG.gain.value = 0; fuegoG.connect(master);
  // Soplo grave y continuo del fuego
  const s = ruido(3, true), lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = "lowpass"; lp.frequency.value = 300; g.gain.value = 0.5; lfo(0.6, 0.2, g.gain);
  s.connect(lp); lp.connect(g); g.connect(fuegoG); s.start();
  chasquido();
}
export function fogataSonido(distancia) {
  if (!ac) return;
  if (!fuegoG) crearFuego();
  fuegoG.gain.setTargetAtTime(0.5 * Math.max(0, 1 - distancia / 18) ** 2, ac.currentTime, 0.4);
}

/** Chapoteo de un pez: ruido corto que baja de tono. */
export function salpicar() {
  if (!ac) return;
  const t = ac.currentTime + 0.01, s = ruido(0.4, false), bp = ac.createBiquadFilter(), g = ac.createGain();
  bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(1800, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
  g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  s.connect(bp); bp.connect(g); g.connect(eco); s.start(t); s.stop(t + 0.4);
}
