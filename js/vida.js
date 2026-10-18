/* ===== Vida en el bosque: zorros, pájaros, peces, mariposas y una fogata =====
   Los animales (Quaternius, CC0) traen su propia animación; aquí solo se decide a dónde van. */
import * as THREE from "three";
import { clone as clonarEsqueleto } from "three/addons/utils/SkeletonUtils.js";
import { altura, distRio, rioAncho, rioX, AGUA } from "./terreno.js";
import { INICIO, FOGATA } from "./bosque.js";

const azar = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();

/** Prepara un modelo animado: lo escala a `largo` metros y lo deja apoyado en y=0. */
function preparar(gltf, largo, giro = 0) {
  const base = gltf.scene;
  const caja = new THREE.Box3().setFromObject(base), tam = caja.getSize(new THREE.Vector3());
  const k = largo / Math.max(tam.x, tam.z);
  return { base, k, giro, pie: -caja.min.y * k, clip: gltf.animations[0] };
}
function ejemplar(modelo, padre) {
  const raiz = new THREE.Group(), cuerpo = clonarEsqueleto(modelo.base);
  cuerpo.scale.setScalar(modelo.k); cuerpo.position.y = modelo.pie; cuerpo.rotation.y = modelo.giro;
  cuerpo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  raiz.add(cuerpo); padre.add(raiz);
  const mixer = new THREE.AnimationMixer(cuerpo);
  const accion = mixer.clipAction(modelo.clip); accion.play(); accion.time = Math.random() * modelo.clip.duration;
  return { raiz, cuerpo, mixer, accion };
}
/** Gira el objeto hacia un ángulo con suavidad (sin saltos bruscos). */
function girarHacia(obj, ang, dt, vel) {
  let d = ang - obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  obj.rotation.y += d * Math.min(1, dt * vel);
}
const sueloLibre = (x, z) => distRio(x, z) - rioAncho(z) > 2.5;

export async function crearVida(Q, loader, sonido) {
  const grupo = new THREE.Group(); grupo.name = "vida";
  const [gZorro, gPajaro, gPez] = await Promise.all(["zorro", "pajaro", "pez"].map(n => loader.loadAsync(`assets/animales/${n}.glb`)));
  // El pájaro y el pez miran hacia +z en su archivo; el zorro hacia -z, por eso se gira media vuelta.
  const mZorro = preparar(gZorro, 0.95, Math.PI), mPajaro = preparar(gPajaro, 0.45), mPez = preparar(gPez, 0.4);

  /* --- Zorros: pasean por el claro y la orilla, y se apartan si la persona se acerca --- */
  const zorros = [];
  for (let i = 0; i < Q.zorros; i++) {
    const z = ejemplar(mZorro, grupo);
    const a = Math.random() * 6.28, r = azar(7, 16);
    z.raiz.position.set(INICIO.x + Math.cos(a) * r, 0, INICIO.z + Math.sin(a) * r);
    z.meta = new THREE.Vector3(); z.espera = 0; z.vel = azar(0.9, 1.3);
    zorros.push(z);
  }
  const nuevaMeta = (z, jugador) => {
    for (let n = 0; n < 20; n++) {
      const a = Math.random() * 6.28, r = azar(5, 22);
      const x = INICIO.x + Math.cos(a) * r, zz = INICIO.z + Math.sin(a) * r;
      if (sueloLibre(x, zz) && Math.hypot(x - jugador.x, zz - jugador.z) > 4) { z.meta.set(x, 0, zz); return; }
    }
  };

  /* --- Pájaros: bandadas que dan vueltas sobre el río y el claro --- */
  const bandadas = [];
  for (let b = 0; b < Q.bandadas; b++) {
    const aves = [];
    for (let i = 0; i < 6; i++) {
      const p = ejemplar(mPajaro, grupo); p.accion.timeScale = azar(0.9, 1.2);
      p.desfase = [azar(-4, 4), azar(-1.5, 1.5), azar(-4, 4), Math.random() * 6.28];
      aves.push(p);
    }
    bandadas.push({ aves, radio: azar(28, 55), alto: azar(14, 24), vel: azar(0.07, 0.11) * (b % 2 ? 1 : -1), fase: Math.random() * 6.28, cx: INICIO.x - 6 + b * 4, cz: INICIO.z - 20 - b * 12 });
  }

  /* --- Peces: de vez en cuando uno salta en el río, cerca de la persona --- */
  const peces = Array.from({ length: Q.peces }, () => {
    const p = ejemplar(mPez, grupo); p.raiz.visible = false; p.t = -azar(2, 8); return p;
  });
  const ondaGeo = new THREE.RingGeometry(0.15, 0.22, 32); ondaGeo.rotateX(-Math.PI / 2);
  const ondas = Array.from({ length: Q.peces * 2 }, () => {
    const m = new THREE.Mesh(ondaGeo, new THREE.MeshBasicMaterial({ color: 0xfff2dc, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; grupo.add(m); return m;
  });
  let ondaSig = 0;
  const salpicar = (x, z) => {
    const o = ondas[ondaSig++ % ondas.length]; o.position.set(x, AGUA + 0.02, z); o.scale.setScalar(1); o.visible = true; o.vida = 0;
    sonido?.salpicar?.(x, z);
  };

  /* --- Mariposas: alas que aletean en el shader, una sola llamada de dibujo --- */
  const mariposas = crearMariposas(Q.mariposas);
  grupo.add(mariposas.malla);

  /* --- Fogata: troncos y piedras de Kenney, llamas, chispas y una luz cálida que titila --- */
  const fogata = await crearFogata(loader);
  grupo.add(fogata);

  grupo.animar = (dt, T, jugador) => {
    for (const z of zorros) {
      z.mixer.update(dt * z.vel);
      const p = z.raiz.position;
      if (z.meta.lengthSq() === 0 || p.distanceTo(z.meta) < 0.8) nuevaMeta(z, jugador);
      if (Math.hypot(p.x - jugador.x, p.z - jugador.z) < 3 && Math.hypot(z.meta.x - jugador.x, z.meta.z - jugador.z) < 5) nuevaMeta(z, jugador);
      girarHacia(z.raiz, Math.atan2(z.meta.x - p.x, z.meta.z - p.z), dt, 2.5);
      p.x += Math.sin(z.raiz.rotation.y) * z.vel * dt; p.z += Math.cos(z.raiz.rotation.y) * z.vel * dt;
      p.y = altura(p.x, p.z);
    }
    for (const b of bandadas) {
      const a = b.fase + T * b.vel, cx = b.cx + Math.cos(a) * b.radio, cz = b.cz + Math.sin(a) * b.radio * 0.7;
      const rumbo = Math.atan2(-Math.sin(a) * b.radio * b.vel, Math.cos(a) * b.radio * 0.7 * b.vel);
      for (const p of b.aves) {
        p.mixer.update(dt);
        const [ox, oy, oz, f] = p.desfase;
        p.raiz.position.set(cx + ox + Math.sin(T * 0.7 + f) * 0.8, altura(cx, cz) + b.alto + oy + Math.sin(T * 1.3 + f) * 0.5, cz + oz);
        p.raiz.rotation.set(0, rumbo, Math.sin(T * 0.5 + f) * 0.15);
      }
    }
    for (const p of peces) {
      p.t += dt;
      if (p.t < 0) continue;
      if (!p.raiz.visible) {                      // elegir un lugar del río a la vista
        const z = jugador.z + azar(-14, 14), w = rioAncho(z) * 0.6;
        p.ini = new THREE.Vector3(rioX(z) + azar(-w, w), AGUA, z);
        p.dir = Math.random() * 6.28; p.raiz.visible = true; p.t = 0; salpicar(p.ini.x, p.ini.z);
      }
      const dur = 0.9, k = p.t / dur;
      p.mixer.update(dt * 2);
      p.raiz.position.set(p.ini.x + Math.sin(p.dir) * k * 1.1, AGUA - 0.15 + Math.sin(Math.PI * k) * 0.75, p.ini.z + Math.cos(p.dir) * k * 1.1);
      p.raiz.rotation.set(-Math.cos(Math.PI * k) * 0.9, p.dir, 0, "YXZ");
      if (k >= 1) { p.raiz.visible = false; p.t = -azar(4, 11); salpicar(p.raiz.position.x, p.raiz.position.z); }
    }
    for (const o of ondas) {
      if (!o.visible) continue;
      o.vida += dt; o.scale.setScalar(1 + o.vida * 4); o.material.opacity = Math.max(0, 0.6 - o.vida * 0.5);
      if (o.vida > 1.2) o.visible = false;
    }
    mariposas.animar(T, jugador);
    fogata.animar(T, dt);
  };
  grupo.fogata = fogata;
  return grupo;
}

function crearMariposas(n) {
  const g = new THREE.BufferGeometry();
  // Dos alas (cuatro triángulos); el signo de x dice qué ala es
  const v = [0, 0, 0, -0.07, 0, -0.05, -0.065, 0, 0.035, 0, 0, 0, -0.065, 0, 0.035, -0.03, 0, 0.06,
             0, 0, 0, 0.07, 0, -0.05, 0.065, 0, 0.035, 0, 0, 0, 0.065, 0, 0.035, 0.03, 0, 0.06];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(v.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const tiempo = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, emissive: 0x302010 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = tiempo;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float fase = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7;
        float ang = (0.25 + 0.95 * (0.5 + 0.5 * sin(uT * 14.0 + fase))) * sign(position.x);
        transformed.y = abs(position.x) * sin(ang);
        transformed.x = position.x * cos(ang);`);
  };
  const malla = new THREE.InstancedMesh(g, mat, n);
  malla.frustumCulled = false;
  const colores = [0xf2b134, 0xf07b3f, 0xffffff, 0xa7c7f2, 0xe8d56a];
  const datos = Array.from({ length: n }, (_, i) => {
    malla.setColorAt(i, new THREE.Color(colores[i % colores.length]));
    return { cx: INICIO.x + azar(-18, 18), cz: INICIO.z + azar(-18, 18), r: azar(1, 3.5), h: azar(0.4, 1.6), v: azar(0.3, 0.7), f: Math.random() * 6.28 };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  return {
    malla,
    animar(T) {
      tiempo.value = T;
      datos.forEach((d, i) => {
        const a = d.f + T * d.v, x = d.cx + Math.cos(a) * d.r + Math.sin(T * 1.7 + d.f) * 0.3, z = d.cz + Math.sin(a * 1.3) * d.r;
        const y = Math.max(altura(x, z), AGUA) + d.h + Math.sin(T * 2.3 + d.f) * 0.25;
        e.set(0, -a + Math.PI / 2, 0);
        m.compose(_v.set(x, y, z), q.setFromEuler(e), s); malla.setMatrixAt(i, m);
      });
      malla.instanceMatrix.needsUpdate = true;
    }
  };
}

async function crearFogata(loader) {
  const g = new THREE.Group(); g.position.copy(FOGATA);
  const colores = { wood: 0x6b4428, woodDark: 0x3e2716, stone: 0x77746c };
  for (const n of ["campfire_stones", "campfire_logs"]) {
    const m = (await loader.loadAsync(`assets/modelos/${n}.glb`)).scene;
    m.scale.setScalar(4.2);
    m.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: colores[o.material.name] ?? 0x6b4428, roughness: 0.95 }); o.castShadow = o.receiveShadow = true; } });
    g.add(m);
  }
  // Llamas: sprites con brillo aditivo que cambian de tamaño
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x2 = c.getContext("2d");
  const gr = x2.createRadialGradient(32, 92, 2, 32, 80, 60);
  gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.25, "rgba(255,170,60,.9)"); gr.addColorStop(0.6, "rgba(230,80,20,.35)"); gr.addColorStop(1, "rgba(200,40,10,0)");
  x2.fillStyle = gr; x2.beginPath(); x2.moveTo(32, 4); x2.quadraticCurveTo(62, 70, 46, 120); x2.lineTo(18, 120); x2.quadraticCurveTo(2, 70, 32, 4); x2.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const llamas = [0, 1, 2, 3].map(i => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.center.set(0.5, 0.05); s.position.set((i - 1.5) * 0.12, 0.08, (i % 2 - 0.5) * 0.12); g.add(s); return s;
  });
  const luz = new THREE.PointLight(0xff8a3c, 3, 14, 1.4); luz.position.y = 0.7; g.add(luz);
  // Chispas que suben
  const N = 40, pos = new Float32Array(N * 3), sem = Array.from({ length: N }, () => [Math.random(), azar(-0.25, 0.25), azar(-0.25, 0.25)]);
  const chispas = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffb060, size: 0.04, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(chispas);
  g.animar = (T) => {
    llamas.forEach((s, i) => { const k = 0.85 + 0.25 * Math.sin(T * (7 + i * 1.7) + i) + 0.1 * Math.sin(T * 17 + i * 3); s.scale.set(0.42 * k, 0.85 * k, 1); });
    luz.intensity = 2.6 + Math.sin(T * 9) * 0.35 + Math.sin(T * 23) * 0.2;
    sem.forEach(([f, dx, dz], i) => { const t = (T * 0.35 + f) % 1; pos[i * 3] = dx * (1 + t) + Math.sin(T * 3 + i) * 0.05; pos[i * 3 + 1] = 0.2 + t * 2.2; pos[i * 3 + 2] = dz * (1 + t); });
    chispas.geometry.attributes.position.needsUpdate = true;
  };
  return g;
}
