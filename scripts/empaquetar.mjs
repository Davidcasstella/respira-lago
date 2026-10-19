/* Arma un solo HTML con todo adentro (código, estilos, texturas y modelos) para abrirlo con doble clic,
   sin servidor: npm run build:archivo → dist/respira-bosque.html. Solo necesita internet para Three.js. */
import { build } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../frontend/', import.meta.url));
const OUT = process.argv[2] || fileURLToPath(new URL('../dist/respira-bosque.html', import.meta.url));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const r = await build({ entryPoints: [path.join(R, 'js/app.js')], bundle: true, format: 'esm', write: false, external: ['three', 'three/addons/*'] });
let js = r.outputFiles[0].text;
const m = js.match(/var manager = new THREE\d*\.LoadingManager\(\);/);
if (!m) { console.error('no encontré el LoadingManager'); process.exit(1); }
js = js.replace(m[0], m[0] + '\nmanager.setURLModifier((u) => window.RESPIRA_ASSETS[u] || u);');
const assets = {};
const tipos = { '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
for (const dir of ['assets', 'assets/texturas', 'assets/modelos', 'assets/animales']) {
  for (const f of fs.readdirSync(path.join(R, dir))) {
    const ext = path.extname(f); if (!tipos[ext]) continue;
    assets[`${dir}/${f}`] = `data:${tipos[ext]};base64,` + fs.readFileSync(path.join(R, dir, f)).toString('base64');
  }
}
let html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(R, 'css/estilos.css'), 'utf8');
const proto = fs.readFileSync(path.join(R, 'js/protocolo.js'), 'utf8');
const rep = (a, b) => { if (!html.includes(a)) { console.error('falta', a); process.exit(1); } html = html.replace(a, () => b); };
rep('<link rel="stylesheet" href="css/estilos.css">', `<style>\n${css}\n</style>`);
rep('<script src="js/protocolo.js"></script>', `<script>\n${proto}\n</script>\n<script>window.RESPIRA_ASSETS = ${JSON.stringify(assets)};</script>`);
rep('<script type="module" src="js/app.js"></script>', `<script type="module">\n${js.replace(/<\/script/g, '<\\/script')}\n</script>`);
fs.writeFileSync(OUT, html);
console.log('listo', OUT, (html.length / 1e6).toFixed(1), 'MB,', Object.keys(assets).length, 'recursos');
