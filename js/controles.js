/* ===== Movimiento: mouse + teclado en el computador, joystick en el celular, mandos en VR =====
   Computador: clic en la escena captura el mouse (PointerLockControls), Esc lo suelta.
   W A S D caminar · Shift correr · Espacio saltar · F volar (en vuelo: Espacio sube, Ctrl o C baja). */
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { altura, AGUA, LIMITE } from "./terreno.js";
import { colisionar } from "./bosque.js";

const CAMINAR = 2.4, CORRER = 5.5, VOLAR = 8, VOLAR_RAPIDO = 18, VR_PASO = 1.4;
const GRAVEDAD = 16, SALTO = 5.2, OJOS = 1.6, RADIO = 0.3, TECHO = 70;

export class Jugador {
  constructor({ camera, rig, canvas, renderer }) {
    Object.assign(this, { camera, rig, canvas, renderer });
    this.activo = false;                 // solo se mueve durante la sesión o el paseo libre
    this.vel = new THREE.Vector3(); this.vy = 0; this.enSuelo = true;
    this.volando = false; this.corriendoTactil = false;
    this.teclas = {}; this.joy = { x: 0, y: 0 }; this.botones = {};
    this.giroVR = 0; this.alCambiar = () => {};

    camera.rotation.order = "YXZ";
    this.plc = new PointerLockControls(camera, canvas);
    this.plc.pointerSpeed = 0.8;
    this.plc.addEventListener("lock", () => this.alCambiar());
    this.plc.addEventListener("unlock", () => this.alCambiar());

    this.#teclado(); this.#puntero();
  }

  get capturado() { return this.plc.isLocked; }
  soltar() { if (this.plc.isLocked) document.exitPointerLock?.(); }

  #teclado() {
    const propias = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "KeyC", "KeyF"];
    addEventListener("keydown", e => {
      if (!this.activo || e.target.closest?.("input")) return;
      if (e.target.closest?.("button")) e.target.blur();    // que Espacio no vuelva a pulsar el último botón
      if (propias.includes(e.code)) e.preventDefault();
      if (e.code === "KeyF" && !e.repeat) this.alternarVuelo();
      if (e.code === "Space" && !e.repeat && !this.volando) this.saltar();
      this.teclas[e.code] = true;
    });
    addEventListener("keyup", e => { this.teclas[e.code] = false; });
    addEventListener("blur", () => { this.teclas = {}; });
  }

  #puntero() {
    // Mouse: clic para capturar. Dedo (o mouse si no se pudo capturar): arrastrar para mirar.
    let arrastre = null;
    this.canvas.addEventListener("pointerdown", e => {
      if (!this.activo || this.renderer.xr.isPresenting) return;
      if (e.pointerType === "mouse" && !this.plc.isLocked) {
        try { const p = this.canvas.requestPointerLock(); p?.catch?.(() => {}); } catch (x) {}
      }
      arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { this.canvas.setPointerCapture(e.pointerId); } catch (x) {}
    });
    this.canvas.addEventListener("pointermove", e => {
      if (!arrastre || e.pointerId !== arrastre.id || this.plc.isLocked) return;
      const k = e.pointerType === "touch" ? 0.005 : 0.004;
      this.mirar((e.clientX - arrastre.x) * k, (e.clientY - arrastre.y) * k);
      arrastre.x = e.clientX; arrastre.y = e.clientY;
    });
    ["pointerup", "pointercancel"].forEach(t => this.canvas.addEventListener(t, e => { if (arrastre?.id === e.pointerId) arrastre = null; }));
  }

  mirar(dx, dy) {
    const c = this.camera.rotation;
    c.y -= dx; c.x = Math.max(-1.45, Math.min(1.45, c.x - dy));
  }

  /** Joystick virtual: un círculo que se arrastra con el pulgar izquierdo. */
  conectarJoystick(zona, perilla) {
    let id = null, cx = 0, cy = 0;
    const radio = () => zona.clientWidth / 2;
    const mover = e => {
      const r = radio(); let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
      if (d > r) { dx *= r / d; dy *= r / d; }
      perilla.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / r; this.joy.y = -dy / r;
    };
    zona.addEventListener("pointerdown", e => {
      e.preventDefault(); id = e.pointerId; try { zona.setPointerCapture(id); } catch (x) {}
      const b = zona.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; mover(e);
    });
    zona.addEventListener("pointermove", e => { if (e.pointerId === id) mover(e); });
    const fin = e => { if (e.pointerId !== id) return; id = null; this.joy.x = this.joy.y = 0; perilla.style.transform = ""; };
    zona.addEventListener("pointerup", fin); zona.addEventListener("pointercancel", fin);
  }

  /** Botones táctiles: mantener (saltar/subir, bajar) o alternar (correr, volar). */
  conectarBoton(boton, accion) {
    const on = e => {
      e.preventDefault(); boton.classList.add("on");
      if (accion === "saltar") { this.botones.subir = true; if (!this.volando) this.saltar(); }
      if (accion === "bajar") this.botones.bajar = true;
      if (accion === "correr") { this.corriendoTactil = !this.corriendoTactil; boton.setAttribute("aria-pressed", this.corriendoTactil); }
      if (accion === "volar") this.alternarVuelo();
    };
    const off = () => {
      if (accion === "saltar") this.botones.subir = false;
      if (accion === "bajar") this.botones.bajar = false;
      if (accion === "saltar" || accion === "bajar") boton.classList.remove("on");
    };
    boton.addEventListener("pointerdown", on);
    ["pointerup", "pointerleave", "pointercancel"].forEach(t => boton.addEventListener(t, off));
    if (accion === "correr" || accion === "volar") boton.addEventListener("pointerup", () => boton.classList.remove("on"));
  }

  saltar() { if (this.enSuelo && !this.renderer.xr.isPresenting) { this.vy = SALTO; this.enSuelo = false; } }

  alternarVuelo() {
    if (this.renderer.xr.isPresenting) return;      // en VR no se vuela: marea
    this.volando = !this.volando; this.vy = 0;
    if (this.volando) this.rig.position.y += 0.3;
    this.alCambiar();
  }

  /** Coloca a la persona de pie en (x, z) mirando hacia yaw. */
  ubicar(x, z, yaw) {
    this.rig.position.set(x, altura(x, z), z); this.rig.rotation.set(0, 0, 0);
    this.camera.position.set(0, OJOS, 0); this.camera.rotation.set(0, yaw, 0);
    this.vy = 0; this.volando = false; this.vel.set(0, 0, 0);
  }

  /** Entrando y saliendo de VR/AR: el visor controla la cabeza; aquí solo se mueve el "cuerpo". */
  entrarXR() {
    this.soltar(); this.volando = false; this.corriendoTactil = false; this.vy = 0;
    const yaw = this.camera.rotation.y;
    this.camera.position.set(0, 0, 0); this.camera.rotation.set(0, 0, 0);
    this.rig.rotation.set(0, yaw, 0);
    this.alCambiar();
  }
  salirXR() {
    const yaw = this.rig.rotation.y;
    this.rig.rotation.set(0, 0, 0); this.camera.position.set(0, OJOS, 0); this.camera.rotation.set(0, yaw, 0);
    this.alCambiar();
  }

  #suelo(x, z) { return altura(x, z); }

  update(dt) {
    const xr = this.renderer.xr.isPresenting, p = this.rig.position, t = this.teclas;
    let ax = 0, az = 0, sube = 0, rapido = false;

    if (xr) {
      [ax, az] = this.#mandosVR(dt);
    } else if (this.activo) {
      az = (t.KeyW || t.ArrowUp ? 1 : 0) - (t.KeyS || t.ArrowDown ? 1 : 0) + this.joy.y;
      ax = (t.KeyD || t.ArrowRight ? 1 : 0) - (t.KeyA || t.ArrowLeft ? 1 : 0) + this.joy.x;
      rapido = !!(t.ShiftLeft || t.ShiftRight) || this.corriendoTactil;
      sube = (t.Space || this.botones.subir ? 1 : 0) - (t.ControlLeft || t.ControlRight || t.KeyC || this.botones.bajar ? 1 : 0);
    }
    const largo = Math.hypot(ax, az); if (largo > 1) { ax /= largo; az /= largo; }

    // Dirección según hacia dónde se mira (solo el giro horizontal)
    const yaw = xr ? this.#yawCabeza() : this.camera.rotation.y;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let suelo = this.#suelo(p.x, p.z);
    const enAgua = suelo < AGUA - 0.15 && !this.volando;
    const v = xr ? VR_PASO : this.volando ? (rapido ? VOLAR_RAPIDO : VOLAR) : (rapido ? CORRER : CAMINAR) * (enAgua ? 0.55 : 1);
    const objetivo = new THREE.Vector3((fx * az + rx * ax) * v, 0, (fz * az + rz * ax) * v);
    this.vel.lerp(objetivo, Math.min(1, dt * (this.enSuelo || this.volando ? 10 : 2.5)));   // en el aire se controla menos
    p.x += this.vel.x * dt; p.z += this.vel.z * dt;

    // Límites: obstáculos (troncos, rocas grandes) y borde del mundo
    if (!this.volando || p.y - suelo < 3) colisionar(p, RADIO);
    const r = Math.hypot(p.x, p.z); if (r > LIMITE) { p.x *= LIMITE / r; p.z *= LIMITE / r; }
    suelo = this.#suelo(p.x, p.z);

    if (xr) { p.y = suelo; this.enSuelo = true; this.vy = 0; return; }   // en VR siempre pegado al suelo
    if (this.volando) {
      p.y = Math.min(suelo + TECHO, Math.max(suelo, p.y + sube * (rapido ? 9 : 5) * dt));
      this.enSuelo = p.y <= suelo + 0.01;
    } else {
      this.vy -= GRAVEDAD * dt; p.y += this.vy * dt;
      if (p.y <= suelo) { p.y = suelo; this.vy = 0; this.enSuelo = true; }
      else if (p.y - suelo > 0.05) this.enSuelo = false;
    }
  }

  #yawCabeza() {
    const d = new THREE.Vector3(); this.renderer.xr.getCamera().getWorldDirection(d);
    return Math.atan2(-d.x, -d.z);
  }

  // Palanca izquierda: caminar despacio. Palanca derecha: giro por pasos de 30° (marea menos que el giro continuo).
  #mandosVR(dt) {
    const s = this.renderer.xr.getSession(); let ax = 0, az = 0;
    this.giroVR = Math.max(0, this.giroVR - dt);
    for (const src of s?.inputSources || []) {
      const a = src.gamepad?.axes; if (!a || a.length < 2) continue;
      const x = a.length >= 4 ? a[2] : a[0], y = a.length >= 4 ? a[3] : a[1];
      if (src.handedness === "right") {
        if (Math.abs(x) > 0.7 && this.giroVR === 0) { this.#girarVR(x > 0 ? -Math.PI / 6 : Math.PI / 6); this.giroVR = 0.35; }
      } else { if (Math.abs(x) > 0.15) ax = x; if (Math.abs(y) > 0.15) az = -y; }
    }
    return [ax, az];
  }
  #girarVR(ang) {
    // Gira el cuerpo alrededor de la cabeza para que la vista no se desplace
    const cab = new THREE.Vector3(); this.renderer.xr.getCamera().getWorldPosition(cab);
    const p = this.rig.position, dx = p.x - cab.x, dz = p.z - cab.z, c = Math.cos(ang), s = Math.sin(ang);
    p.x = cab.x + dx * c + dz * s; p.z = cab.z - dx * s + dz * c;
    this.rig.rotation.y += ang;
  }
}
