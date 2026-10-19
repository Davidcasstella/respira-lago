/* ===== Terreno con relieve suave y el cauce del río ===== */
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

export const TAM = 420;            // lado del terreno en metros
export const AGUA = -0.25;         // altura de la superficie del río
export const LIMITE = 150;         // radio caminable desde el centro

// Línea central del río (recorre el eje z) y su medio ancho
export const rioX = z => 9 * Math.sin(z * 0.021) + 4 * Math.sin(z * 0.053 + 1.3);
export const rioAncho = z => 4 + 1.2 * Math.sin(z * 0.04 + 0.5);
export const distRio = (x, z) => Math.abs(x - rioX(z));

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Ruido de valor simple y determinista (para manchas de tierra y densidad del bosque)
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function ruido(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Altura del suelo en (x, z). La usan el terreno, la colisión y la colocación de plantas. */
export function altura(x, z) {
  const w = rioAncho(z), d = distRio(x, z);
  const lomas = 0.8 * (Math.sin(x * 0.031 + 0.4) * Math.cos(z * 0.027) + 1)
              + 0.4 * (Math.sin(x * 0.071 - z * 0.053) + 1)
              + 0.15 * (Math.sin(x * 0.17 + z * 0.13) + 1);
  const valle = smooth(14, 90, d) * 7;                      // laderas del valle
  const borde = smooth(120, 200, Math.hypot(x, z)) * 22;    // colinas que cierran el horizonte
  const orilla = 0.4 + lomas * smooth(w + 2, w + 18, d) + valle + borde;
  const lecho = -1.1 + 0.5 * smooth(0, w, d);               // más hondo en el centro
  return lecho + (orilla - lecho) * smooth(w, w + 5, d);
}

/** Textura repetible con espacio de color e intervalo de repetición. */
function tex(loader, url, srgb) {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearTerreno(Q, loader) {
  const seg = Q.terrenoSeg;
  const geo = new THREE.PlaneGeometry(TAM, TAM, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const mezcla = new Float32Array(n * 3), color = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = altura(x, z);
    pos.setY(i, h);
    const piedra = 1 - smooth(-0.2, 0.3, h);                                   // lecho y orilla mojada
    const tierra = smooth(0.55, 0.85, ruido(x * 0.06, z * 0.06)) * (1 - piedra);  // manchas de hojarasca
    mezcla[i * 3] = 1; mezcla[i * 3 + 1] = tierra; mezcla[i * 3 + 2] = piedra;
    const k = 0.82 + 0.3 * ruido(x * 0.15 + 40, z * 0.15);                     // rompe la repetición
    color[i * 3] = k * 0.86; color[i * 3 + 1] = k; color[i * 3 + 2] = k * 0.7;   // un poco más verde
  }
  geo.setAttribute("mezcla", new THREE.BufferAttribute(mezcla, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geo.computeVertexNormals();

  const rep = TAM / 4;                                   // una baldosa de pasto cada 4 m
  const pasto = tex(loader, "assets/texturas/leafy_grass_diff_1k.jpg", true);
  const pastoN = tex(loader, "assets/texturas/leafy_grass_nor_1k.jpg", false);
  const hojas = tex(loader, "assets/texturas/forest_leaves_04_diff_1k.jpg", true);
  const piedras = tex(loader, "assets/texturas/river_small_rocks_diff_1k.jpg", true);
  [pasto, pastoN].forEach(t => t.repeat.set(rep, rep));

  const mat = new THREE.MeshStandardMaterial({ map: pasto, normalMap: pastoN, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 1, metalness: 0, vertexColors: true });
  // Mezcla de tres texturas según el atributo "mezcla" (pasto, hojarasca, piedras de río)
  mat.onBeforeCompile = sh => {
    sh.uniforms.tHojas = { value: hojas }; sh.uniforms.tPiedras = { value: piedras };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 mezcla;\nvarying vec3 vMezcla;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMezcla = mezcla;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D tHojas;\nuniform sampler2D tPiedras;\nvarying vec3 vMezcla;")
      .replace("#include <map_fragment>", `
        vec3 cP = texture2D(map, vMapUv).rgb;
        vec3 cH = texture2D(tHojas, vMapUv * 0.7).rgb;
        vec3 cR = texture2D(tPiedras, vMapUv * 1.4).rgb;
        vec3 cMix = mix(mix(cP, cH, vMezcla.y), cR * 0.8, vMezcla.z);
        diffuseColor.rgb *= cMix;`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/** Cinta plana que sigue el río; Water necesita una superficie plana (plano XY girado). */
function cintaRio() {
  const pasos = 140, v = [], idx = [];
  for (let i = 0; i <= pasos; i++) {
    const z = -TAM / 2 + (i / pasos) * TAM, c = rioX(z), w = rioAncho(z) + 4;
    v.push(c - w, -z, 0, c + w, -z, 0);   // y = -z: tras girar -90° en X queda en el plano XZ
    if (i < pasos) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function crearAgua(Q, loader, solDir, niebla) {
  const normales = loader.load("assets/waternormals.jpg");
  normales.wrapS = normales.wrapT = THREE.RepeatWrapping;
  let agua;
  if (Q.aguaReflejo) {
    agua = new Water(cintaRio(), {
      textureWidth: 512, textureHeight: 512, waterNormals: normales,
      sunDirection: solDir.clone(), sunColor: 0xffc890, waterColor: 0x1d3a3a,
      distortionScale: 2.2, fog: !!niebla, alpha: 0.95
    });
    agua.material.uniforms.size.value = 3.5;
    agua.avanzar = (dt) => { agua.material.uniforms.time.value += dt * 0.6; };
  } else {
    // Versión liviana: sin reflejo en tiempo real, refleja el cielo del entorno
    normales.repeat.set(12, 120);
    const mat = new THREE.MeshStandardMaterial({ color: 0x24423f, roughness: 0.08, metalness: 0.35, normalMap: normales, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.88 });
    const g = cintaRio();
    // UV a lo largo del río para que la textura corra con la corriente
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = (i % 2); uv[i * 2 + 1] = i / p.count; }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    agua = new THREE.Mesh(g, mat);
    agua.avanzar = (dt) => { normales.offset.y -= dt * 0.012; };
  }
  agua.rotation.x = -Math.PI / 2;
  agua.position.y = AGUA;
  return agua;
}
