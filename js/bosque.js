/* ===== Bosque: árboles, arbustos, helechos, rocas, troncos, pasto y partículas =====
   Todo se dibuja con InstancedMesh: una sola llamada de dibujo por pieza, aunque haya cientos. */
import * as THREE from "three";
import { altura, distRio, rioAncho, rioX, ruido, AGUA, LIMITE } from "./terreno.js";

// Azar con semilla: el bosque sale igual en cada visita (y en las capturas)
function azar(semilla) {
  return () => { semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = azar(20261018);
const entre = (a, b) => a + rnd() * (b - a);

// Uniforme de tiempo compartido por el viento del pasto y de las copas
export const viento = { value: 0 };
function conViento(mat, fuerza) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uViento = viento;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uViento;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 base = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        #else
          vec2 base = vec2(0.0);
        #endif
        float k = max(position.y, 0.0); k *= k;
        transformed.x += sin(uViento * 1.3 + base.x * 0.31 + base.y * 0.17) * ${fuerza.toFixed(4)} * k;
        transformed.z += cos(uViento * 1.1 + base.x * 0.21 - base.y * 0.27) * ${(fuerza * 0.6).toFixed(4)} * k;`);
  };
  return mat;
}

/** Copia la geometría con atributos Float32 (los .glb cuantizados traen enteros normalizados). */
function aFlotantes(geo) {
  const g = new THREE.BufferGeometry(), get = ["getX", "getY", "getZ", "getW"];
  for (const [k, a] of Object.entries(geo.attributes)) {
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a[get[c]](i);
    g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
  }
  if (geo.index) g.setIndex(geo.index.clone());
  return g;
}

/** Carga un .glb y devuelve sus piezas con la geometría ya en el espacio del modelo. */
async function piezas(loader, url) {
  const gltf = await loader.loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const out = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const g = aFlotantes(o.geometry); g.applyMatrix4(o.matrixWorld);
    out.push({ geometry: g, material: o.material, nombre: o.name });
  });
  return out;
}

/** Deja la base de la geometría en y=0 y centrada en x/z (para modelos que vienen en grupo). */
function centrar(g) {
  g.computeBoundingBox(); const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return g;
}

/** Crea InstancedMesh para cada pieza de un modelo con la misma lista de matrices. */
function instanciar(grupo, partes, matrices, { sombra = true, recibe = true, variarColor = false } = {}) {
  if (!matrices.length) return;
  // Un tono por ejemplar (igual para todas sus piezas) para que el bosque no se vea clonado
  const tonos = variarColor ? matrices.map(() => new THREE.Color().setHSL(0.08 + rnd() * 0.1, 0.25 + rnd() * 0.2, 0.42 + rnd() * 0.22)) : null;
  for (const p of partes) {
    const im = new THREE.InstancedMesh(p.geometry, p.material, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    if (tonos && /leaf/i.test(p.material.userData.original || "")) tonos.forEach((c, i) => im.setColorAt(i, c.clone().multiplyScalar(2.2)));
    im.castShadow = sombra; im.receiveShadow = recibe;
    im.computeBoundingSphere();
    grupo.add(im);
  }
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function matriz(x, y, z, esc, giro, inclinar = 0) {
  _e.set(entre(-inclinar, inclinar), giro, entre(-inclinar, inclinar));
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.setScalar(esc));
}

// Lugares que no se llenan: el claro donde aparece la persona
export const INICIO = new THREE.Vector3(rioX(6) + 11, 0, 6);
const enClaro = (x, z, r) => Math.hypot(x - INICIO.x, z - INICIO.z) < r;

// Obstáculos (troncos de árboles y rocas grandes) en una rejilla para buscar rápido
const CELDA = 4, rejilla = new Map();
function obstaculo(x, z, r) {
  const k = Math.floor(x / CELDA) + "," + Math.floor(z / CELDA);
  (rejilla.get(k) || rejilla.set(k, []).get(k)).push([x, z, r]);
}
/** Empuja un punto fuera de los obstáculos cercanos. */
export function colisionar(pos, radio) {
  const cx = Math.floor(pos.x / CELDA), cz = Math.floor(pos.z / CELDA);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = rejilla.get((cx + i) + "," + (cz + j)); if (!l) continue;
    for (const [x, z, r] of l) {
      const dx = pos.x - x, dz = pos.z - z, d = Math.hypot(dx, dz), min = r + radio;
      if (d < min && d > 1e-4) { pos.x = x + dx / d * min; pos.z = z + dz / d * min; }
    }
  }
}

/** Puntos repartidos con rejilla + desplazamiento al azar; filtro decide si se usan. */
function repartir(n, radio, filtro) {
  const out = []; let intentos = n * 30;
  while (out.length < n && intentos-- > 0) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radio;
    const x = INICIO.x + Math.cos(a) * r, z = INICIO.z + Math.sin(a) * r;
    if (filtro(x, z)) out.push([x, z]);
  }
  return out;
}

// Colores naturales para los modelos de Kenney (vienen en tonos de caricatura)
const COLORES = { leafsDark: 0x22381f, leafsGreen: 0x34501f, woodBarkDark: 0x3d2c22, woodBark: 0x4a3626, woodInner: 0x8a6a4a, grass: 0x30461f, _defaultMat: 0x3b5424 };
function naturalizar(partes) {
  for (const p of partes) {
    const nombre = p.material.name, hoja = /leaf|grass|default/i.test(nombre);
    const m = new THREE.MeshStandardMaterial({ color: COLORES[nombre] ?? 0x3b5424, roughness: hoja ? 0.85 : 0.95, metalness: 0 });
    m.userData.original = nombre;
    p.material = hoja ? conViento(m, 0.012) : m;
  }
  return partes;
}

export async function crearBosque(Q, loader, alProgreso = () => {}) {
  const bosque = new THREE.Group(); bosque.name = "bosque";
  const M = "assets/modelos/";
  const [pinoA, pinoB, hojaA, hojaB, arbusto, tronco, helecho, rocas] = await Promise.all([
    "tree_pineTallA_detailed", "tree_pineDefaultA", "tree_pineRoundA", "tree_oak",
    "plant_bushDetailed", "log", "fern_02", "rock_moss_set_01"
  ].map(n => piezas(loader, M + n + ".glb").then(r => { alProgreso(); return r; })));
  [pinoA, pinoB, hojaA, hojaB, arbusto, tronco].forEach(naturalizar);

  // Árboles: más densos lejos del río y en manchas, nunca en el agua ni en el claro
  const tipos = [
    { partes: pinoA, alto: [7, 12], peso: 0.4 }, { partes: pinoB, alto: [5, 9], peso: 0.3 },
    { partes: hojaA, alto: [5, 9], peso: 0.2 }, { partes: hojaB, alto: [5, 8], peso: 0.1 }
  ];
  const listas = tipos.map(() => []);
  const ptsArboles = repartir(Q.arboles, LIMITE + 40, (x, z) => {
    const d = distRio(x, z) - rioAncho(z);
    if (d < 3 || enClaro(x, z, 14)) return false;
    const densidad = 0.35 + 0.65 * ruido(x * 0.03, z * 0.03);
    return rnd() < densidad * Math.min(1, d / 12);
  });
  for (const [x, z] of ptsArboles) {
    let r = rnd(), t = 0; while (t < tipos.length - 1 && (r -= tipos[t].peso) > 0) t++;
    const esc = entre(...tipos[t].alto);
    listas[t].push(matriz(x, altura(x, z) - 0.15, z, esc, rnd() * 6.28, 0.04));
    obstaculo(x, z, 0.03 * esc + 0.15);
  }
  tipos.forEach((tp, i) => instanciar(bosque, tp.partes, listas[i], { variarColor: true }));

  // Arbustos en el borde del bosque
  const lArb = repartir(Q.arbustos, 90, (x, z) => { const d = distRio(x, z) - rioAncho(z); return d > 2 && !enClaro(x, z, 4); })
    .map(([x, z]) => matriz(x, altura(x, z) - 0.05, z, entre(1.6, 3), rnd() * 6.28));
  instanciar(bosque, arbusto, lArb);

  // Helechos (Poly Haven): cada planta del archivo es una variante
  let varHelecho = helecho.map(p => ({ ...p, geometry: centrar(p.geometry) }));
  if (!Q.sombras) varHelecho = varHelecho.filter(v => v.geometry.index.count / 3 < 1000);   // en baja, solo las plantas más livianas
  const ptsHel = repartir(Q.helechos, 85, (x, z) => { const d = distRio(x, z) - rioAncho(z); return d > 0.8 && !enClaro(x, z, 2.5) && (d < 10 || rnd() < 0.5); });
  varHelecho.forEach((v, i) => {
    const ms = ptsHel.filter((_, j) => j % varHelecho.length === i).map(([x, z]) => matriz(x, altura(x, z) - 0.03, z, entre(0.9, 1.6), rnd() * 6.28, 0.1));
    instanciar(bosque, [v], ms, { sombra: false });
  });

  // Rocas con musgo (Poly Haven): en las orillas, dentro del cauce y sueltas en el bosque
  const varRoca = rocas.map(p => ({ ...p, geometry: centrar(p.geometry) }));
  const ptsRoca = [];
  for (let i = 0; i < Q.rocas; i++) {
    const enRio = i < Q.rocas * 0.6;
    const z = INICIO.z + entre(-110, 110), w = rioAncho(z);
    const x = enRio ? rioX(z) + (rnd() < 0.5 ? -1 : 1) * entre(w - 1.5, w + 3) : INICIO.x + entre(-100, 100);
    if (enClaro(x, z, 6) || (!enRio && distRio(x, z) < w + 3)) continue;
    const esc = enRio ? entre(0.35, 1.0) : entre(0.5, 1.4);
    ptsRoca.push([x, z, esc]);
    if (esc > 0.7) obstaculo(x, z, 0.6 * esc);
  }
  varRoca.forEach((v, i) => {
    const ms = ptsRoca.filter((_, j) => j % varRoca.length === i).map(([x, z, e]) => matriz(x, altura(x, z) - 0.25 * e, z, e, rnd() * 6.28, 0.15));
    instanciar(bosque, [v], ms);
  });

  // Troncos caídos
  const lTr = repartir(Q.troncos, 60, (x, z) => distRio(x, z) - rioAncho(z) > 3 && !enClaro(x, z, 5))
    .map(([x, z]) => matriz(x, altura(x, z) + 0.05, z, entre(4, 6), rnd() * 6.28));
  instanciar(bosque, tronco, lTr);

  bosque.add(crearPasto(Q));
  return bosque;
}

/* Pasto: manojos de hojas finas hechos con unos pocos triángulos, mecidos por el viento */
function manojoPasto() {
  const pos = [], col = [], hojas = 9, base = new THREE.Color(0x34451a), punta = new THREE.Color(0xb3b862);
  for (let i = 0; i < hojas; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.18, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = entre(0.22, 0.5), w = entre(0.012, 0.026), g = rnd() * Math.PI, dx = Math.cos(g) * w, dz = Math.sin(g) * w;
    const cx = x + entre(-0.12, 0.12), cz = z + entre(-0.12, 0.12);
    pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, cx, h, cz);
    col.push(...base.toArray(), ...base.toArray(), ...punta.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}
function crearPasto(Q) {
  const mat = conViento(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), 0.35);
  const im = new THREE.InstancedMesh(manojoPasto(), mat, Q.pasto);
  const c = new THREE.Color(); let n = 0, intentos = Q.pasto * 4;
  while (n < Q.pasto && intentos-- > 0) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * Q.pastoRadio;
    const x = INICIO.x + Math.cos(a) * r, z = INICIO.z + Math.sin(a) * r, h = altura(x, z);
    if (h < AGUA + 0.12 || ruido(x * 0.06, z * 0.06) > 0.7) continue;     // ni en el agua ni en la hojarasca
    im.setMatrixAt(n, matriz(x, h - 0.02, z, entre(0.7, 1.4), rnd() * 6.28, 0.12));
    im.setColorAt(n, c.setHSL(0.17 + rnd() * 0.07, 0.35, 0.72 + rnd() * 0.2));
    n++;
  }
  im.count = n; im.receiveShadow = true; im.castShadow = false;
  im.computeBoundingSphere();
  return im;
}

/* Luciérnagas y polen: puntos que flotan alrededor de la persona */
function textoBrillo() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function crearParticulas(Q) {
  const mapa = textoBrillo(), grupos = [];
  const hacer = (n, caja, alto, color, tam, vel) => {
    const p = new Float32Array(n * 3), semilla = [];
    for (let i = 0; i < n; i++) semilla.push([entre(-caja, caja), entre(0.3, alto), entre(-caja, caja), rnd() * 10]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: mapa, color, size: tam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false;
    grupos.push({ pts, p, semilla, caja, vel });
    return pts;
  };
  const luces = hacer(Q.luciernagas, 22, 3.5, 0xffd27a, 0.16, 0.6);
  const polen = hacer(Q.polen, 14, 6, 0xfff1d6, 0.05, 0.25);
  const grupo = new THREE.Group(); grupo.add(luces, polen);
  // Cada punto da vueltas en su sitio y reaparece al otro lado si la persona se aleja
  grupo.animar = (T, centro) => {
    for (const { pts, p, semilla, caja, vel } of grupos) {
      for (let i = 0; i < semilla.length; i++) {
        const s = semilla[i];
        let x = s[0] + Math.sin(T * 0.3 * vel + s[3]) * 1.2, z = s[2] + Math.cos(T * 0.23 * vel + s[3]) * 1.2;
        x = ((x - centro.x + caja) % (2 * caja) + 2 * caja) % (2 * caja) - caja + centro.x;
        z = ((z - centro.z + caja) % (2 * caja) + 2 * caja) % (2 * caja) - caja + centro.z;
        p[i * 3] = x; p[i * 3 + 2] = z;
        p[i * 3 + 1] = Math.max(altura(x, z), AGUA) + s[1] + Math.sin(T * 0.7 * vel + s[3] * 2) * 0.35;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    }
    // Las luciérnagas titilan
    luces.material.opacity = 0.65 + 0.35 * Math.sin(T * 2.1);
  };
  return grupo;
}
