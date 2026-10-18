/* ===== Escena ===== */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const FOG = new THREE.Fog(0x2b2c45, 18, 95);
scene.fog = FOG;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);
const rig = new THREE.Group();            // el "cuerpo" del jugador; en VR la cabeza se mueve sola
rig.add(camera); scene.add(rig);
camera.position.set(0, 1.6, 0);           // 1,6 m: altura de ojos real (listo para VR)
rig.position.set(0, 0, 6);

const world = new THREE.Group(); scene.add(world);   // todo lo que se oculta en AR

// Cielo con degradado
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x1b2140) }, mid: { value: new THREE.Color(0x6b5677) }, low: { value: new THREE.Color(0xf0a676) } },
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h>0.12 ? mix(mid, top, smoothstep(0.12,0.6,h)) : mix(low, mid, smoothstep(-0.02,0.12,h)); gl_FragColor = vec4(c,1.); }"
});
world.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), skyMat));

// Sol bajo
const sun = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: 0xffd3a1, fog: false }));
sun.position.set(-10, 9, -150); world.add(sun);

// Agua con olas suaves
const waterGeo = new THREE.PlaneGeometry(240, 240, 90, 90); waterGeo.rotateX(-Math.PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x3d4f72, roughness: 0.25, metalness: 0.55, flatShading: true }));
world.add(water);

// Colinas lejanas (low-poly)
function hill(x, z, r, h, col) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 1 }));
  m.position.set(x, h / 2 - 0.3, z); m.rotation.y = Math.random() * 3; world.add(m);
}
[[-60,-90,30,22,0x3a3552],[-15,-110,40,30,0x433b5c],[40,-95,34,20,0x3a3552],[85,-70,26,16,0x4a3f5f],[-95,-55,24,14,0x4a3f5f]].forEach(a => hill(...a));
// Orilla con pinos cerca del jugador
const shore = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 0.6, 9), new THREE.MeshStandardMaterial({ color: 0x4b5a4a, flatShading: true }));
shore.position.set(0, 0, 9); world.add(shore);
for (let i = 0; i < 14; i++) {
  const a = Math.PI * 0.15 + (i / 13) * Math.PI * 0.7, r = 7 + Math.random() * 3;
  const h = 2.5 + Math.random() * 2.5;
  const tree = new THREE.Mesh(new THREE.ConeGeometry(0.7 + Math.random() * 0.4, h, 6), new THREE.MeshStandardMaterial({ color: 0x2f4140, flatShading: true }));
  tree.position.set(Math.cos(a) * r, h / 2 + 0.3, 9 + Math.sin(a) * r); world.add(tree);
}

// Luciérnagas
const ffN = 90, ffPos = new Float32Array(ffN * 3), ffSeed = [];
for (let i = 0; i < ffN; i++) { ffSeed.push([Math.random() * 40 - 20, Math.random() * 3 + 0.4, Math.random() * 30 - 22, Math.random() * 6]); }
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.09, transparent: true, opacity: 0.85 }));
world.add(fireflies);

// Luces
scene.add(new THREE.HemisphereLight(0xf3c49a, 0x1b2140, 0.85));
const dir = new THREE.DirectionalLight(0xffc896, 0.9); dir.position.set(-20, 12, -60); scene.add(dir);

// Orbe guía (en metros: 1,6 m de alto, 3 m delante)
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,240,215,1)"); gr.addColorStop(0.25, "rgba(255,200,150,.55)"); gr.addColorStop(1, "rgba(255,170,120,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const orb = new THREE.Group();
const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffe9cf }));
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
halo.scale.set(1.6, 1.6, 1);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.64, 64), new THREE.MeshBasicMaterial({ color: 0x8fc3c0, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
orb.add(core, halo, ring); scene.add(orb);
const orbLight = new THREE.PointLight(0xffc48a, 1.2, 9); orb.add(orbLight);
orb.position.set(0, 1.6, 3);

/* ===== Controles: arrastrar para mirar, flechas para moverse ===== */
let yaw = 0, pitch = 0; const keys = {}; const held = {};
let dragging = false, lx = 0, ly = 0;
canvas.addEventListener("pointerdown", e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (!dragging) return;
  yaw += (e.clientX - lx) * 0.004; pitch += (e.clientY - ly) * 0.004;
  pitch = Math.max(-1.2, Math.min(1.2, pitch)); lx = e.clientX; ly = e.clientY;
});
["pointerup", "pointercancel"].forEach(t => canvas.addEventListener(t, () => dragging = false));
addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
document.querySelectorAll(".pad button").forEach(b => {
  const d = b.dataset.dir;
  const on = e => { e.preventDefault(); held[d] = true; b.classList.add("on"); };
  const off = () => { held[d] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, off));
});
function move(dt) {
  const f = (held.fwd || keys.w || keys.arrowup ? 1 : 0) - (held.back || keys.s || keys.arrowdown ? 1 : 0);
  const t = (held.right || keys.d || keys.arrowright ? 1 : 0) - (held.left || keys.a || keys.arrowleft ? 1 : 0);
  yaw -= t * dt * 0.9;                                   // girar despacio: evita mareo
  const sp = 1.4 * dt * f;                               // caminar a paso tranquilo
  rig.position.x -= Math.sin(yaw) * sp; rig.position.z -= Math.cos(yaw) * sp;
  const r = Math.hypot(rig.position.x, rig.position.z - 9);
  if (r > 8.5) { const k = 8.5 / r; rig.position.x *= k; rig.position.z = 9 + (rig.position.z - 9) * k; } // quedarse en la orilla
  if (!renderer.xr.isPresenting) { rig.rotation.y = yaw; camera.rotation.x = -pitch; }
}

/* ===== Sonido ambiente (sintetizado, sin archivos) ===== */
let ac, master, swell, pad, soundOn = true;
function startAudio() {
  if (ac) { ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 3);
    // Olas: ruido marrón filtrado con oleaje lento
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    swell = ac.createGain(); swell.gain.value = 0.25;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.09; lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(swell.gain); noise.connect(lp); lp.connect(swell); swell.connect(master);
    noise.start(); lfo.start();
    // Acorde suave que sube al inhalar
    pad = ac.createGain(); pad.gain.value = 0.02; pad.connect(master);
    [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = (i - 2) * 3;
      const g = ac.createGain(); g.gain.value = 0.18 / (i + 1); o.connect(g); g.connect(pad); o.start();
    });
  } catch (e) { ac = null; }
}
function setSound(on) {
  soundOn = on; if (!ac) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ac.currentTime + 0.8);
}

/* ===== Voz guía ===== */
let voiceOn = true, esVoice = null;
function pickVoice() { const v = speechSynthesis?.getVoices?.() || []; esVoice = v.find(x => /^es/i.test(x.lang)) || null; }
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(t) {
  if (!voiceOn || !("speechSynthesis" in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "es-ES"; if (esVoice) u.voice = esVoice; u.rate = 0.85; u.pitch = 0.9; u.volume = 0.8; speechSynthesis.speak(u); } catch (e) {}
}

/* ===== Sesión de respiración ===== */
const $ = id => document.getElementById(id);
let state = "idle", sessionLen = 180, tStart = 0, lastPhase = "", preScore = 6, wakeLock = null;
const cycle = PROTOCOL.inhale + PROTOCOL.hold + PROTOCOL.exhale + PROTOCOL.rest;
function phaseAt(t) {
  let c = t % cycle;
  if (c < PROTOCOL.inhale) return ["inhale", c / PROTOCOL.inhale, PROTOCOL.inhale - c];
  c -= PROTOCOL.inhale; if (c < PROTOCOL.hold) return ["hold", 1, PROTOCOL.hold - c];
  c -= PROTOCOL.hold; if (c < PROTOCOL.exhale) return ["exhale", 1 - c / PROTOCOL.exhale, PROTOCOL.exhale - c];
  c -= PROTOCOL.exhale; return ["rest", 0, PROTOCOL.rest - c];
}
const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

function bindScale(inp, val, word) {
  const f = () => { val.textContent = inp.value; word.textContent = WORDS[+inp.value]; };
  inp.addEventListener("input", f); f();
}
bindScale($("pre"), $("preVal"), $("preWord"));
bindScale($("post"), $("postVal"), $("postWord"));
document.querySelectorAll("#durations .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll("#durations .chip").forEach(x => x.setAttribute("aria-pressed", "false"));
  c.setAttribute("aria-pressed", "true"); sessionLen = +c.dataset.min * 60;
}));

function show(id) { ["start", "session", "end"].forEach(x => $(x).hidden = x !== id); }
async function begin() {
  preScore = +$("pre").value; startAudio(); setSound(soundOn);
  state = "countin"; tStart = performance.now() / 1000 + 3; lastPhase = "";
  show("session"); $("phase").textContent = "Prepárate"; $("phaseSub").textContent = "Mira la luz sobre el agua. Empezamos en 3 segundos";
  say("Ponte cómodo. Vamos a respirar juntos.");
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (e) {}
}
function finish() {
  state = "done"; try { speechSynthesis.cancel(); } catch (e) {}
  say("Muy bien. Tómate un momento antes de volver.");
  $("post").value = Math.max(0, preScore - 2); $("post").dispatchEvent(new Event("input"));
  $("resultBox").hidden = true; $("save").hidden = false; renderHistory();
  show("end"); try { wakeLock?.release(); } catch (e) {}
}
$("go").addEventListener("click", begin);
$("endT").addEventListener("click", finish);
$("soundT").addEventListener("click", e => { const on = !soundOn; setSound(on); e.currentTarget.setAttribute("aria-pressed", on); });
$("voiceT").addEventListener("click", e => { voiceOn = !voiceOn; if (!voiceOn) try { speechSynthesis.cancel(); } catch (x) {} e.currentTarget.setAttribute("aria-pressed", voiceOn); });
$("again").addEventListener("click", () => { $("pre").value = $("post").value; $("pre").dispatchEvent(new Event("input")); state = "idle"; show("start"); });
$("stay").addEventListener("click", () => { state = "free"; show("session"); $("phase").textContent = "Libre"; $("phaseSub").textContent = "Camina por la orilla. Toca Terminar cuando quieras"; $("bar").style.width = "100%"; $("clock").textContent = ""; });

function loadHist() { try { return JSON.parse(localStorage.getItem("respira-hist") || "[]"); } catch (e) { return []; } }
function renderHistory() {
  const h = loadHist().slice(-4).reverse();
  $("history").innerHTML = h.length ? "<div style='border:0'><span>Sesiones anteriores</span><span>antes → después</span></div>" + h.map(r =>
    `<div><span>${new Date(r.t).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · ${r.min} min</span><span>${r.pre} → ${r.post}</span></div>`).join("") : "";
}
$("save").addEventListener("click", () => {
  const post = +$("post").value, diff = preScore - post;
  $("rFrom").textContent = preScore; $("rTo").textContent = post;
  $("rText").textContent = diff > 0 ? `Bajó ${diff} ${diff === 1 ? "punto" : "puntos"}. Tu cuerpo respondió a la respiración.`
    : diff === 0 ? "Se mantuvo igual. A veces toma más de una sesión; puedes repetir." : "Subió un poco. Vale la pena comentarlo con tu psicólogo.";
  const h = loadHist(); h.push({ t: Date.now(), pre: preScore, post, min: Math.round(sessionLen / 60) });
  try { localStorage.setItem("respira-hist", JSON.stringify(h.slice(-30))); } catch (e) {}
  $("resultBox").hidden = false; $("save").hidden = true; renderHistory();
});

/* ===== VR y AR (WebXR) ===== */
let arMode = false;
async function enterXR(mode) {
  const note = $("xrNote");
  if (!navigator.xr) { note.textContent = "Este navegador no tiene WebXR. Ábrelo en el navegador de unas gafas (por ejemplo Meta Quest) o en Chrome de Android para AR."; return; }
  let ok = false; try { ok = await navigator.xr.isSessionSupported(mode); } catch (e) {}
  if (!ok) { note.textContent = mode === "immersive-vr" ? "Este dispositivo no ofrece VR desde aquí. En unas gafas con navegador funciona con el mismo botón." : "Este dispositivo no ofrece AR desde aquí. Pruébalo en Chrome de Android o en gafas con passthrough."; return; }
  try {
    const session = await navigator.xr.requestSession(mode, { optionalFeatures: ["local-floor"] });
    startAudio(); renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor");
    arMode = mode === "immersive-ar"; world.visible = !arMode; scene.fog = arMode ? null : FOG;
    rig.rotation.set(0, 0, 0); camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 0);
    await renderer.xr.setSession(session);
    if (state === "idle") begin();
    session.addEventListener("end", () => { arMode = false; world.visible = true; scene.fog = FOG; camera.position.set(0, 1.6, 0); });
  } catch (e) { note.textContent = "No se pudo abrir la sesión inmersiva. Revisa que la página se abra con https y que el navegador de las gafas tenga WebXR activo."; }
}
$("vrBtn").addEventListener("click", () => enterXR("immersive-vr"));
$("arBtn").addEventListener("click", () => enterXR("immersive-ar"));

/* ===== Bucle ===== */
const clock3 = new THREE.Clock(); const tmp = new THREE.Vector3(); const fwd = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock3.getDelta(), 0.05), now = performance.now() / 1000, T = clock3.elapsedTime;
  move(dt);

  // Olas
  const p = waterGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const x = waterBase[i], z = waterBase[i + 2]; p[i + 1] = Math.sin(x * 0.18 + T * 0.6) * 0.12 + Math.cos(z * 0.22 + T * 0.45) * 0.1 - 0.15; }
  waterGeo.attributes.position.needsUpdate = true; waterGeo.computeVertexNormals();
  // Luciérnagas
  for (let i = 0; i < ffN; i++) { const s = ffSeed[i]; ffPos[i * 3] = s[0] + Math.sin(T * 0.3 + s[3]) * 0.8; ffPos[i * 3 + 1] = s[1] + Math.sin(T * 0.7 + s[3] * 2) * 0.3; ffPos[i * 3 + 2] = s[2] + Math.cos(T * 0.25 + s[3]) * 0.8; }
  ffGeo.attributes.position.needsUpdate = true;

  // Respiración
  let breath = 0.5 + 0.08 * Math.sin(T * 0.8);
  if (state === "countin" || state === "running") {
    const t = now - tStart;
    if (t < 0) { $("clock").textContent = "Empieza en " + Math.ceil(-t); }
    else {
      state = "running";
      const [ph, v, left] = phaseAt(t); breath = ease(v);
      if (ph !== lastPhase) {
        lastPhase = ph; $("phase").textContent = PROTOCOL.cues[ph][0]; $("phaseSub").textContent = PROTOCOL.cues[ph][1];
        if (PROTOCOL.voice[ph]) say(PROTOCOL.voice[ph]);
        if (ac && pad) { pad.gain.cancelScheduledValues(ac.currentTime); pad.gain.linearRampToValueAtTime(ph === "inhale" ? 0.09 : 0.02, ac.currentTime + (ph === "inhale" ? PROTOCOL.inhale : PROTOCOL.exhale)); }
      }
      $("bar").style.width = Math.min(100, t / sessionLen * 100) + "%";
      $("clock").textContent = fmt(sessionLen - t) + " restantes · " + Math.ceil(left) + " s";
      if (t >= sessionLen && ph === "rest") finish();
    }
  }
  const s = 0.55 + breath * 0.85;
  core.scale.setScalar(s); halo.scale.set(1.2 + breath * 2.4, 1.2 + breath * 2.4, 1);
  ring.scale.setScalar(0.7 + breath * 0.9); ring.material.opacity = 0.25 + breath * 0.45;
  orbLight.intensity = 0.6 + breath * 1.6;

  // El orbe se queda delante de la mirada, a 3 m, siguiéndola despacio
  camera.getWorldPosition(tmp); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const target = tmp.clone().addScaledVector(fwd, 3); target.y = tmp.y + (arMode ? 0 : 0.1);
  orb.position.lerp(target, Math.min(1, dt * 1.2)); ring.lookAt(tmp);

  renderer.render(scene, camera);
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
