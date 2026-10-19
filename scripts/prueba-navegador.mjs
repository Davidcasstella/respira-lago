/* Prueba de humo en Chromium headless (escritorio y celular): npm run test:navegador
   Falla (código 1) si hay errores de consola, peticiones fallidas o si la sesión no funciona.
   Opcional: --capturas carpeta/  guarda capturas de pantalla.  --calidad alta  usa el perfil alto. */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { servir } from "./servir.mjs";

const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const capturas = arg("--capturas"), calidad = arg("--calidad") || "baja";
if (capturas) mkdirSync(capturas, { recursive: true });

const servidor = await servir(0);
const URL_BASE = `http://localhost:${servidor.address().port}/?calidad=${calidad}`;
// SwiftShader: WebGL por software, así funciona sin GPU (CI)
const navegador = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const fallos = [];
const comprobar = (cond, msj) => { console.log(`${cond ? "✓" : "✗"} ${msj}`); if (!cond) fallos.push(msj); };

for (const modo of ["escritorio", "celular"]) {
  console.log(`\n— ${modo} (${calidad}) —`);
  const ctx = await navegador.newContext(modo === "celular" ? { ...devices["Pixel 7"] } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(240000);
  const errores = [];
  page.on("console", m => { if (m.type() === "error") errores.push(m.text()); });
  page.on("pageerror", e => errores.push(e.message));
  page.on("requestfailed", r => errores.push(`falló ${r.url()}`));
  page.on("response", r => { if (r.status() >= 400) errores.push(`HTTP ${r.status()} ${r.url()}`); });

  await page.goto(URL_BASE);
  await page.waitForSelector('body[data-listo="1"]');
  comprobar(!(await page.textContent("#carga")).includes("No se pudieron"), "carga el bosque y los animales");
  if (capturas) await page.screenshot({ path: `${capturas}/${modo}-inicio.png` });

  await page.click("#go");
  await page.waitForTimeout(6000);
  comprobar((await page.textContent("#guiaCuerpo")).length > 5, "la guía de respiración da instrucciones");
  const pos = () => page.evaluate(() => window.respira.rig.position.toArray());
  const p0 = await pos();
  if (modo === "escritorio") {
    await page.keyboard.down("KeyW"); await page.waitForTimeout(2500); await page.keyboard.up("KeyW");
  } else {
    const b = await page.locator("#joy").boundingBox();
    await page.evaluate(([x, y]) => {
      const z = document.getElementById("joy"), ev = (t, yy) => z.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: "touch", clientX: x, clientY: yy, bubbles: true }));
      ev("pointerdown", y); ev("pointermove", y - 60); window._fin = () => ev("pointerup", y - 60);
    }, [b.x + b.width / 2, b.y + b.height / 2]);
    await page.waitForTimeout(2500); await page.evaluate(() => window._fin());
  }
  const p1 = await pos();
  comprobar(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 0.01, "la persona se mueve");
  await page.click("#guiaMin"); await page.waitForTimeout(300);
  comprobar(await page.evaluate(() => document.getElementById("guia").classList.contains("min")), "la guía se minimiza");
  if (capturas) await page.screenshot({ path: `${capturas}/${modo}-sesion.png` });
  await page.click("#guia");

  await page.evaluate(() => document.exitPointerLock?.());
  await page.click("#endT"); await page.click("#save");
  comprobar((await page.textContent("#rText")).length > 0, "muestra el resultado antes → después");
  comprobar(await page.evaluate(() => JSON.parse(localStorage.getItem("respira-hist") || "[]").length === 1), "guarda la sesión en el historial");
  comprobar(errores.length === 0, `sin errores de consola${errores.length ? ": " + errores.join(" | ") : ""}`);
  await ctx.close();
}

await navegador.close(); servidor.close();
console.log(fallos.length ? `\n${fallos.length} comprobación(es) fallaron` : "\nTodo bien");
process.exit(fallos.length ? 1 : 0);
