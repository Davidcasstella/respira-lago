/* ===== Respira: escena del bosque, sesión de respiración, voz y VR/AR =====
   El contenido terapéutico (tiempos y frases) vive en js/protocolo.js: PROTOCOL y WORDS. */
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Q, nivel, guardarCalidad } from "./calidad.js";
import { crearTerreno, crearAgua, rioX, distRio, AGUA } from "./terreno.js";
import { crearBosque, crearParticulas, viento, INICIO } from "./bosque.js";
import { Jugador } from "./controles.js";
import { iniciarSonido, sonidoEncendido, haySonido, faseSonido, rioSonido } from "./sonido.js";

/* ===== Escena ===== */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.antialias, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Q.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = Q.sombras;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.setFramebufferScaleFactor?.(Q.xrEscala);

const scene = new THREE.Scene();
const NIEBLA = new THREE.FogExp2(0xa88f7c, Q.niebla);
scene.fog = NIEBLA;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 3000);
const rig = new THREE.Group();            // el "cuerpo" del jugador; en VR la cabeza se mueve sola
rig.add(camera); scene.add(rig);

const world = new THREE.Group(); scene.add(world);   // todo lo que se oculta en AR

// Cielo físico del atardecer (Sky de los ejemplos de Three.js) y luz del sol
const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(87.6), THREE.MathUtils.degToRad(200));
const sky = new Sky(); sky.scale.setScalar(2500);
const u = sky.material.uniforms;
u.turbidity.value = 10; u.rayleigh.value = 2.6; u.mieCoefficient.value = 0.008; u.mieDirectionalG.value = 0.93; u.sunPosition.value.copy(sol);
world.add(sky);

// El cielo también ilumina: se convierte en mapa de entorno una sola vez
{
  const pm = new THREE.PMREMGenerator(renderer), cieloSolo = new THREE.Scene(), copia = new Sky();
  copia.scale.setScalar(2500); copia.material.uniforms = THREE.UniformsUtils.clone(u); cieloSolo.add(copia);
  scene.environment = pm.fromScene(cieloSolo, 0, 0.1, 3000).texture;
  scene.environmentIntensity = 0.8;
  pm.dispose();
}

const hemi = new THREE.HemisphereLight(0xffd2a6, 0x3a4a2a, 0.9); scene.add(hemi);
const luzSol = new THREE.DirectionalLight(0xffb27a, 2.4);
luzSol.castShadow = Q.sombras;
Object.assign(luzSol.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 220 });
luzSol.shadow.mapSize.set(Q.sombraTam, Q.sombraTam);
luzSol.shadow.bias = -0.0004; luzSol.shadow.normalBias = 0.04; luzSol.shadow.radius = 4;
scene.add(luzSol, luzSol.target);

// Terreno, río y bosque
const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
world.add(crearTerreno(Q, texLoader));
const agua = crearAgua(Q, texLoader, sol, true); world.add(agua);
const particulas = crearParticulas(Q); world.add(particulas);

const $ = id => document.getElementById(id);
let piezasListas = 0;
const avisoCarga = () => { const p = Math.round(piezasListas / 8 * 100); $("carga").textContent = p < 100 ? `Cargando el bosque… ${p} %` : ""; };
crearBosque(Q, new GLTFLoader(manager), () => { piezasListas++; avisoCarga(); })
  .then(b => { world.add(b); $("carga").textContent = ""; document.body.dataset.listo = "1"; })
  .catch(e => { console.warn("No se pudo cargar el bosque", e); $("carga").textContent = "No se pudieron cargar los árboles; el ejercicio funciona igual."; document.body.dataset.listo = "1"; });

// Orbe guía (en metros: 1,6 m de alto, 3 m delante)
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,240,215,1)"); gr.addColorStop(0.25, "rgba(255,200,150,.55)"); gr.addColorStop(1, "rgba(255,170,120,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const orb = new THREE.Group();
const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffe9cf, toneMapped: false, fog: false }));
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
halo.scale.set(1.6, 1.6, 1);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.64, 64), new THREE.MeshBasicMaterial({ color: 0x8fc3c0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, toneMapped: false, fog: false }));
orb.add(core, halo, ring); scene.add(orb);
const orbLight = new THREE.PointLight(0xffc48a, 1.2, 9, 1.4); orb.add(orbLight);

/* ===== Movimiento ===== */
const jugador = new Jugador({ camera, rig, canvas, renderer });
const YAW_INICIO = 0.55;                                   // mirando río abajo, con el agua a la izquierda
jugador.ubicar(INICIO.x, INICIO.z, YAW_INICIO);
orb.position.set(INICIO.x - 1.5, rig.position.y + 1.7, INICIO.z - 2.6);

const tactil = matchMedia("(pointer: coarse)").matches || ("ontouchstart" in window && navigator.maxTouchPoints > 0);
document.body.classList.toggle("tactil", tactil);
addEventListener("touchstart", () => document.body.classList.add("tactil"), { once: true, passive: true });
jugador.conectarJoystick($("joy"), $("joyKnob"));
document.querySelectorAll(".act").forEach(b => jugador.conectarBoton(b, b.dataset.acc));
jugador.alCambiar = () => {
  const xr = renderer.xr.isPresenting;
  $("btnBajar").hidden = !jugador.volando;
  $("btnVolar").setAttribute("aria-pressed", jugador.volando);
  $("btnSaltar").textContent = jugador.volando ? "Subir" : "Saltar";
  $("ayuda").textContent = jugador.capturado
    ? (jugador.volando ? "Volando · Espacio sube · Ctrl o C baja · F para aterrizar · Esc suelta el mouse" : "W A S D caminar · Shift correr · Espacio saltar · F volar · Esc suelta el mouse")
    : "Clic en la escena para mirar con el mouse";
  document.body.classList.toggle("xr", xr);
};
jugador.alCambiar();

/* ===== Voz guía ===== */
let voiceOn = true, esVoice = null;
function pickVoice() { const v = speechSynthesis?.getVoices?.() || []; esVoice = v.find(x => /^es/i.test(x.lang)) || null; }
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(t) {
  if (!voiceOn || !("speechSynthesis" in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "es-ES"; if (esVoice) u.voice = esVoice; u.rate = 0.85; u.pitch = 0.9; u.volume = 0.8; speechSynthesis.speak(u); } catch (e) {}
}

/* ===== Sesión de respiración ===== */
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
// Calidad: se guarda y se recarga la escena con el nuevo perfil
document.querySelectorAll("#calidad .chip").forEach(c => {
  c.setAttribute("aria-pressed", c.dataset.q === nivel);
  c.addEventListener("click", () => {
    if (c.dataset.q === nivel) return;
    guardarCalidad(c.dataset.q);
    const url = new URL(location.href); url.searchParams.delete("calidad"); location.replace(url);
  });
});

function show(id) {
  ["start", "session", "end"].forEach(x => $(x).hidden = x !== id);
  jugador.activo = id === "session";
  if (id !== "session") jugador.soltar();
}
async function begin() {
  preScore = +$("pre").value; iniciarSonido(); sonidoEncendido(haySonido());
  state = "countin"; tStart = performance.now() / 1000 + 3; lastPhase = "";
  show("session"); $("phase").textContent = "Prepárate"; $("phaseSub").textContent = "Mira la luz junto al río. Empezamos en 3 segundos";
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
$("soundT").addEventListener("click", e => { const on = !haySonido(); sonidoEncendido(on); e.currentTarget.setAttribute("aria-pressed", on); });
$("voiceT").addEventListener("click", e => { voiceOn = !voiceOn; if (!voiceOn) try { speechSynthesis.cancel(); } catch (x) {} e.currentTarget.setAttribute("aria-pressed", voiceOn); });
$("again").addEventListener("click", () => { $("pre").value = $("post").value; $("pre").dispatchEvent(new Event("input")); state = "idle"; show("start"); });
$("stay").addEventListener("click", () => { state = "free"; show("session"); $("phase").textContent = "Libre"; $("phaseSub").textContent = "Camina por el bosque. Toca Terminar cuando quieras"; $("bar").style.width = "100%"; $("clock").textContent = ""; });

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
    iniciarSonido(); renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType("local-floor");
    arMode = mode === "immersive-ar"; world.visible = !arMode; scene.fog = arMode ? null : NIEBLA;
    jugador.entrarXR();
    await renderer.xr.setSession(session);
    try { renderer.xr.setFoveation(Q.xrEscala < 1 ? 1 : 0.5); } catch (e) {}
    if (state === "idle") begin();
    jugador.alCambiar();
    session.addEventListener("end", () => { arMode = false; world.visible = true; scene.fog = NIEBLA; jugador.salirXR(); });
  } catch (e) { note.textContent = "No se pudo abrir la sesión inmersiva. Revisa que la página se abra con https y que el navegador de las gafas tenga WebXR activo."; }
}
$("vrBtn").addEventListener("click", () => enterXR("immersive-vr"));
$("arBtn").addEventListener("click", () => enterXR("immersive-ar"));

/* ===== Bucle ===== */
const clock3 = new THREE.Clock(); const tmp = new THREE.Vector3(); const fwd = new THREE.Vector3(); const target = new THREE.Vector3();
const derecha = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock3.getDelta(), 0.05), now = performance.now() / 1000, T = clock3.elapsedTime;
  jugador.update(dt);
  viento.value = T;
  agua.avanzar(dt);
  camera.getWorldPosition(tmp);
  particulas.animar(T, tmp);

  // El sol y su sombra siguen a la persona (la sombra solo cubre lo cercano)
  luzSol.position.copy(rig.position).addScaledVector(sol, 120);
  luzSol.target.position.copy(rig.position);

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
        faseSonido(ph, ph === "inhale" ? PROTOCOL.inhale : PROTOCOL.exhale);
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
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  target.copy(tmp).addScaledVector(fwd, 3); target.y = tmp.y + (arMode ? 0 : 0.1);
  orb.position.lerp(target, Math.min(1, dt * 1.2)); ring.lookAt(tmp);

  // El río suena más fuerte de cerca y del lado donde está
  derecha.set(-fwd.z, 0, fwd.x);
  rioSonido(distRio(tmp.x, tmp.z), Math.sign(rioX(tmp.z) - tmp.x) * derecha.x);

  renderer.render(scene, camera);
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// Para las pruebas automáticas y para depurar desde la consola
window.respira = { scene, camera, rig, jugador, renderer, Q, nivel, estado: () => state, AGUA };
