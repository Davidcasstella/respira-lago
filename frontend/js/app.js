/* ===== Respira: escena del bosque, sesión de respiración, voz y VR/AR =====
   El contenido terapéutico (tiempos y frases) vive en js/protocolo.js: PROTOCOL y WORDS. */
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Q, nivel, guardarCalidad } from "./config/calidad.js";
import { crearTerreno, crearAgua, rioX, distRio, AGUA } from "./escena/terreno.js";
import { crearBosque, crearParticulas, viento, INICIO, YAW_INICIO, FOGATA } from "./escena/bosque.js";
import { crearVida } from "./escena/vida.js";
import { crearGuia, crearGuiaXR } from "./sesion/guia.js";
import { faseEn, suavizar, formatoTiempo } from "./sesion/respiracion.js";
import { Jugador } from "./controles/controles.js";
import { iniciarSonido, sonidoEncendido, haySonido, faseSonido, rioSonido, fogataSonido, salpicar } from "./audio/sonido.js";
import { decir, vozActiva, activarVoz, callarVoz } from "./audio/voz.js";
import { historial } from "./servicios/historial.js";

/* ===== Escena ===== */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.antialias, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Q.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.shadowMap.enabled = Q.sombras;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.setFramebufferScaleFactor?.(Q.xrEscala);

const scene = new THREE.Scene();
const NIEBLA = new THREE.FogExp2(0xd0a27e, Q.niebla)   // bruma dorada, no gris;
scene.fog = NIEBLA;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 3000);
const rig = new THREE.Group();            // el "cuerpo" del jugador; en VR la cabeza se mueve sola
rig.add(camera); scene.add(rig);

const world = new THREE.Group(); scene.add(world);   // todo lo que se oculta en AR

// Cielo físico de la hora dorada (Sky de los ejemplos de Three.js) y luz del sol
const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(85.5), THREE.MathUtils.degToRad(200));
const sky = new Sky(); sky.scale.setScalar(2500);
const u = sky.material.uniforms;
u.turbidity.value = 8; u.rayleigh.value = 3.4; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.9; u.sunPosition.value.copy(sol);
world.add(sky);

// El cielo también ilumina: se convierte en mapa de entorno una sola vez
{
  const pm = new THREE.PMREMGenerator(renderer), cieloSolo = new THREE.Scene(), copia = new Sky();
  copia.scale.setScalar(2500); copia.material.uniforms = THREE.UniformsUtils.clone(u); cieloSolo.add(copia);
  scene.environment = pm.fromScene(cieloSolo, 0, 0.1, 3000).texture;
  scene.environmentIntensity = 0.9;
  pm.dispose();
}

const hemi = new THREE.HemisphereLight(0xffdcae, 0x56603a, 0.85); scene.add(hemi);
const luzSol = new THREE.DirectionalLight(0xffb070, 2.5);
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
let piezasListas = 0, vida = null;
const avisoCarga = () => { const p = Math.round(piezasListas / 12 * 100); $("carga").textContent = p < 100 ? `Cargando el bosque… ${p} %` : ""; };
const gltf = new GLTFLoader(manager);
crearBosque(Q, gltf, () => { piezasListas++; avisoCarga(); })
  .then(b => { world.add(b); return crearVida(Q, gltf, { salpicar }); })
  .then(v => { vida = v; world.add(v); $("carga").textContent = ""; document.body.dataset.listo = "1"; })
  .catch(e => { console.warn("No se pudo cargar el bosque", e); $("carga").textContent = "No se pudieron cargar los árboles o los animales; el ejercicio funciona igual."; document.body.dataset.listo = "1"; });

// Guía de respiración: panel con pulmones y brazos (pantalla) o el mismo dibujo flotando (VR/AR)
const guia = crearGuia($("guia"));
const guiaXR = crearGuiaXR(THREE); guiaXR.visible = false; scene.add(guiaXR);

/* ===== Movimiento ===== */
const jugador = new Jugador({ camera, rig, canvas, renderer });
jugador.ubicar(INICIO.x, INICIO.z, YAW_INICIO);           // mirando río abajo, con el agua a la izquierda

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

/* ===== Sesión de respiración ===== */
let state = "idle", sessionLen = 180, tStart = 0, lastPhase = "", preScore = 6, wakeLock = null;

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
  show("session"); $("phase").textContent = "Prepárate"; $("phaseSub").textContent = "Siéntate o párate cómodo. Empezamos en 3 segundos";
  guia.preparar(PROTOCOL.brazos === false ? "Hombros sueltos, mirada suave" : "Brazos relajados a los lados del cuerpo");
  decir("Ponte cómodo. Vamos a respirar juntos.");
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (e) {}
}
function finish() {
  state = "done"; callarVoz();
  decir("Muy bien. Tómate un momento antes de volver.");
  $("post").value = Math.max(0, preScore - 2); $("post").dispatchEvent(new Event("input"));
  $("resultBox").hidden = true; $("save").hidden = false; renderHistory();
  show("end"); try { wakeLock?.release(); } catch (e) {}
}
$("go").addEventListener("click", begin);
$("endT").addEventListener("click", finish);
$("soundT").addEventListener("click", e => { const on = !haySonido(); sonidoEncendido(on); e.currentTarget.setAttribute("aria-pressed", on); });
$("voiceT").addEventListener("click", e => { activarVoz(!vozActiva()); e.currentTarget.setAttribute("aria-pressed", vozActiva()); });
$("again").addEventListener("click", () => { $("pre").value = $("post").value; $("pre").dispatchEvent(new Event("input")); state = "idle"; show("start"); });
$("stay").addEventListener("click", () => { state = "free"; show("session"); $("phase").textContent = "Libre"; $("phaseSub").textContent = "Camina por el bosque. Toca Terminar cuando quieras"; $("bar").style.width = "100%"; $("clock").textContent = ""; });

function renderHistory() {
  const h = historial.ultimas(4), n = v => Number(v) || 0;   // solo números: el historial viene de localStorage
  $("history").innerHTML = h.length ? "<div style='border:0'><span>Sesiones anteriores</span><span>antes → después</span></div>" + h.map(r =>
    `<div><span>${new Date(n(r.t)).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} · ${n(r.min)} min</span><span>${n(r.pre)} → ${n(r.post)}</span></div>`).join("") : "";
}
$("save").addEventListener("click", () => {
  const post = +$("post").value, diff = preScore - post;
  $("rFrom").textContent = preScore; $("rTo").textContent = post;
  $("rText").textContent = diff > 0 ? `Bajó ${diff} ${diff === 1 ? "punto" : "puntos"}. Tu cuerpo respondió a la respiración.`
    : diff === 0 ? "Se mantuvo igual. A veces toma más de una sesión; puedes repetir." : "Subió un poco. Vale la pena comentarlo con tu psicólogo.";
  historial.guardar({ pre: preScore, post, min: Math.round(sessionLen / 60) });
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
  let breath = 0;
  const respirando = state === "countin" || state === "running";
  document.body.classList.toggle("respirando", respirando);
  if (respirando) {
    const t = now - tStart;
    if (t < 0) { $("clock").textContent = "Empieza en " + Math.ceil(-t); $("guiaFase").textContent = Math.ceil(-t); }
    else {
      state = "running";
      const [ph, v, left] = faseEn(t, PROTOCOL); breath = suavizar(v);
      if (ph !== lastPhase) {
        lastPhase = ph; $("phase").textContent = PROTOCOL.cues[ph][0]; $("phaseSub").textContent = PROTOCOL.cues[ph][1];
        if (PROTOCOL.voice[ph]) decir(PROTOCOL.voice[ph]);
        faseSonido(ph, ph === "inhale" ? PROTOCOL.inhale : PROTOCOL.exhale);
      }
      $("bar").style.width = Math.min(100, t / sessionLen * 100) + "%";
      $("clock").textContent = formatoTiempo(sessionLen - t) + " restantes · " + Math.ceil(left) + " s";
      guia.actualizar(ph, breath, PROTOCOL.brazos !== false);
      $("guiaFase").textContent = Math.ceil(left) + " s";
      if (t >= sessionLen && ph === "rest") finish();
    }
  }

  // En VR/AR la guía flota abajo a la izquierda de la mirada, sin tapar el frente
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  guiaXR.visible = renderer.xr.isPresenting && respirando;
  if (guiaXR.visible) {
    target.copy(fwd).applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.45).multiplyScalar(2.2).add(tmp); target.y = tmp.y - 0.45;
    guiaXR.position.lerp(target, Math.min(1, dt * 1.5));
    guiaXR.dibujar(breath, PROTOCOL.brazos !== false);
  }

  vida?.animar(dt, T, tmp);
  fogataSonido(Math.hypot(tmp.x - FOGATA.x, tmp.z - FOGATA.z));

  // El río suena más fuerte de cerca y del lado donde está
  derecha.set(-fwd.z, 0, fwd.x);
  rioSonido(distRio(tmp.x, tmp.z), Math.sign(rioX(tmp.z) - tmp.x) * derecha.x);

  renderer.render(scene, camera);
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// Para las pruebas automáticas y para depurar desde la consola
window.respira = { scene, camera, rig, jugador, renderer, Q, nivel, estado: () => state, AGUA };
