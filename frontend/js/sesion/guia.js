/* ===== Guía de respiración: figura con pulmones que se llenan y brazos que suben =====
   En pantalla es un panel a un lado (se puede minimizar). En VR/AR se dibuja lo mismo
   en un lienzo que flota abajo a la izquierda de la mirada. */

// Trazos compartidos por el SVG y el lienzo de VR (coordenadas del viewBox)
const P = {
  torso: "M66 64 Q100 50 134 64 L130 160 Q100 172 70 160 Z",
  pulmonI: "M96 80 C84 74 72 86 71 106 C69 126 71 142 81 144 C91 146 95 137 96 125 Z",
  pulmonD: "M104 80 C116 74 128 86 129 106 C131 126 129 142 119 144 C109 146 105 137 104 125 Z",
  traquea: "M100 50 L100 82 M100 82 L93 91 M100 82 L107 91",
  brazo: "M0 0 L-9 78"            // desde el hombro hacia abajo; se gira según la fase
};
const HOMBRO_I = [68, 66], HOMBRO_D = [132, 66], GIRO_MAX = 150;   // grados con los brazos arriba
const CENTRO_PULMON = [100, 110];

const svgNS = "http://www.w3.org/2000/svg";
function el(tag, attrs, padre) { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); padre?.appendChild(e); return e; }

export function crearGuia(contenedor) {
  const svg = el("svg", { viewBox: "0 -40 200 220", class: "guia-dibujo", "aria-hidden": "true" });
  el("circle", { cx: 100, cy: 32, r: 15, class: "g-cuerpo" }, svg);
  el("path", { d: P.torso, class: "g-cuerpo" }, svg);
  const brazos = [HOMBRO_I, HOMBRO_D].map(([x, y], i) => {
    const g = el("g", { transform: `translate(${x} ${y})` }, svg);
    const giro = el("g", {}, g);
    el("path", { d: i ? "M0 0 L9 78" : P.brazo, class: "g-brazo" }, giro);
    el("circle", { cx: i ? 9 : -9, cy: 82, r: 6, class: "g-mano" }, giro);
    return giro;
  });
  const pulmones = el("g", {}, svg);
  el("path", { d: P.pulmonI, class: "g-pulmon" }, pulmones);
  el("path", { d: P.pulmonD, class: "g-pulmon" }, pulmones);
  el("path", { d: P.traquea, class: "g-traquea" }, svg);
  contenedor.querySelector(".guia-lienzo").appendChild(svg);

  const fase = contenedor.querySelector("#guiaFase"), cuerpo = contenedor.querySelector("#guiaCuerpo");
  const boton = contenedor.querySelector("#guiaMin");
  const CLAVE = "respira-guia-min";
  let minimizada = false; try { minimizada = localStorage.getItem(CLAVE) === "1"; } catch (e) {}
  const aplicar = () => {
    contenedor.classList.toggle("min", minimizada);
    boton.setAttribute("aria-expanded", !minimizada);
    boton.setAttribute("aria-label", minimizada ? "Mostrar la guía de respiración" : "Minimizar la guía");
    boton.textContent = minimizada ? "" : "–";
  };
  const alternar = e => { e.stopPropagation(); minimizada = !minimizada; aplicar(); try { localStorage.setItem(CLAVE, minimizada ? "1" : "0"); } catch (x) {} };
  boton.addEventListener("click", alternar);
  contenedor.addEventListener("click", e => { if (minimizada) alternar(e); });   // minimizada, todo el círculo la abre
  aplicar();

  let ultima = "";
  return {
    /** b: 0 (vacío) … 1 (lleno). brazos: si la figura sube los brazos. */
    actualizar(nombreFase, b, conBrazos) {
      const s = 0.8 + b * 0.28;
      pulmones.setAttribute("transform", `translate(${CENTRO_PULMON[0]} ${CENTRO_PULMON[1]}) scale(${s.toFixed(3)}) translate(${-CENTRO_PULMON[0]} ${-CENTRO_PULMON[1]})`);
      pulmones.style.opacity = (0.55 + b * 0.45).toFixed(2);
      const a = conBrazos ? b * GIRO_MAX : 0;
      brazos[0].setAttribute("transform", `rotate(${a.toFixed(1)})`);
      brazos[1].setAttribute("transform", `rotate(${(-a).toFixed(1)})`);
      if (nombreFase !== ultima) {
        ultima = nombreFase;
        fase.textContent = PROTOCOL.cues[nombreFase]?.[0] ?? "";
        cuerpo.textContent = (conBrazos ? PROTOCOL.cuerpo?.[nombreFase] : "") || PROTOCOL.cues[nombreFase]?.[1] || "";
      }
    },
    preparar(texto) { ultima = ""; fase.textContent = "Prepárate"; cuerpo.textContent = texto; this.actualizar("", 0, false); ultima = ""; }
  };
}

/* ----- Versión para VR/AR: el mismo dibujo en un lienzo, como sprite ----- */
export function crearGuiaXR(THREE) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d"), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  sprite.scale.set(0.55, 0.55, 1); sprite.renderOrder = 10;
  const caminos = Object.fromEntries(Object.entries(P).map(([k, d]) => [k, new Path2D(d)]));
  let ultimoB = -1;
  sprite.dibujar = (b, conBrazos) => {
    if (Math.abs(b - ultimoB) < 0.004) return; ultimoB = b;
    ctx.clearRect(0, 0, 256, 256);
    ctx.save(); ctx.translate(28, 60); ctx.scale(1, 1);
    ctx.fillStyle = "rgba(20,26,43,0.55)"; ctx.beginPath(); ctx.arc(100, 70, 125, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(238,230,216,0.18)"; ctx.strokeStyle = "rgba(238,230,216,0.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(100, 32, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fill(caminos.torso); ctx.stroke(caminos.torso);
    const a = (conBrazos ? b * GIRO_MAX : 0) * Math.PI / 180;
    ctx.lineWidth = 7; ctx.lineCap = "round";
    [[HOMBRO_I, a, -9], [HOMBRO_D, -a, 9]].forEach(([[x, y], ang, dx]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx, 78); ctx.stroke(); ctx.restore();
    });
    ctx.save(); const s = 0.8 + b * 0.28;
    ctx.translate(CENTRO_PULMON[0], CENTRO_PULMON[1]); ctx.scale(s, s); ctx.translate(-CENTRO_PULMON[0], -CENTRO_PULMON[1]);
    ctx.globalAlpha = 0.55 + b * 0.45; ctx.fillStyle = "#f29b84"; ctx.strokeStyle = "#ffd2bd"; ctx.lineWidth = 2.5;
    ctx.fill(caminos.pulmonI); ctx.stroke(caminos.pulmonI); ctx.fill(caminos.pulmonD); ctx.stroke(caminos.pulmonD);
    ctx.restore();
    ctx.strokeStyle = "#ffd2bd"; ctx.lineWidth = 3; ctx.stroke(caminos.traquea);
    ctx.restore();
    tex.needsUpdate = true;
  };
  return sprite;
}
