# Arquitectura (para desarrolladores)

Proyecto estático: HTML, CSS y JavaScript sin frameworks ni compilación. La única librería es **Three.js r170** (`three@0.170.0`), que se carga con un *import map* desde jsdelivr con la versión exacta. De sus ejemplos oficiales (`examples/jsm`) se usan `Sky`, `Water`, `PointerLockControls` y `GLTFLoader`. Necesita un servidor (`npm run dev`), porque los módulos ES no cargan desde `file://`. Las reglas de organización están en [BUENAS-PRACTICAS.md](BUENAS-PRACTICAS.md).

## Orden de carga

```
frontend/index.html
 ├─ css/estilos.css
 ├─ <script type="importmap">  "three" y "three/addons/" → jsdelivr, three@0.170.0
 ├─ js/protocolo.js   (script clásico) → define PROTOCOL y WORDS (globales)
 └─ js/app.js         (módulo) → usa PROTOCOL y WORDS e importa:
     ├─ config/calidad.js       perfil "alta" o "baja" (Q)
     ├─ escena/terreno.js       altura(x, z), cauce del río, terreno y agua
     ├─ escena/bosque.js        modelos .glb en InstancedMesh, pasto, flores, partículas, colisiones
     ├─ escena/vida.js          animales animados (AnimationMixer), mariposas y fogata
     ├─ sesion/respiracion.js   ritmo: faseEn(t, protocolo), suavizar, formatoTiempo (puras, con pruebas)
     ├─ sesion/guia.js          guía de respiración: SVG en pantalla, lienzo en VR
     ├─ controles/controles.js  clase Jugador: mouse/teclado, táctil y mandos VR
     ├─ audio/sonido.js         río, pájaros, fogata y acorde (Web Audio)
     ├─ audio/voz.js            voz guía (Web Speech)
     └─ servicios/historial.js  historial de sesiones (localStorage; punto de conexión con backend/)
```

`frontend/js/protocolo.js` sigue siendo un script clásico y el único archivo que edita el psicólogo. Sus `const` de primer nivel son globales y el módulo `app.js` las lee directamente.

## Pantallas

`index.html` tiene un `<canvas id="scene">` a pantalla completa y tres capas (`.layer`) encima; solo una se ve a la vez (`show(id)` en `app.js`):

| id | Contenido |
|---|---|
| `#start` | Escala antes, duración, calidad gráfica, botones Comenzar / VR / AR |
| `#session` | Fase actual, progreso, ayuda de teclas (computador), joystick y botones de saltar, correr y volar (táctil), sonido, voz y terminar |
| `#end` | Escala después, resultado, historial, repetir o quedarse |

## Estados de la sesión

```
idle ──Comenzar──▶ countin (3 s) ──▶ running ──fin de tiempo / Terminar──▶ done
  ▲                                                                       │
  └────────────────────────── Repetir ◀──────────────────────────────────┘
                                         done ──Quedarme──▶ free
```

`faseEn(t, PROTOCOL)` (en `sesion/respiracion.js`) convierte los segundos transcurridos en `[fase, valor 0‥1, segundos restantes]` a partir de `PROTOCOL`. El valor pasa por `suavizar()` (coseno) y controla los pulmones y los brazos de la guía. La sesión solo termina al final de una fase `rest`, para no cortar a mitad de una respiración.

## Escena 3D

| Pieza | Archivo | Qué hace |
|---|---|---|
| Cielo | `app.js` | `Sky` (cielo físico) con el sol a unos 2,4° sobre el horizonte. Una copia se pasa por `PMREMGenerator` y queda como `scene.environment`, así el cielo también ilumina los materiales |
| Luz | `app.js` | `HemisphereLight` cálida y `DirectionalLight` del sol con sombras `PCFSoftShadowMap`. La cámara de sombra (±38 m) sigue a la persona |
| Niebla | `app.js` | `FogExp2` de tono cálido; esconde el borde del mundo y le da profundidad al bosque |
| Terreno | `terreno.js` | `PlaneGeometry` de 420 m. Cada vértice toma su altura de `altura(x, z)`: lomas suaves, laderas del valle, el cauce tallado alrededor de `rioX(z)` y colinas en el horizonte. El atributo `mezcla` y `onBeforeCompile` combinan tres texturas: pasto, hojarasca y piedras de río |
| Río | `terreno.js` | Una cinta plana que sigue el cauce. En *alta* es `Water` (reflejo en tiempo real + `waternormals.jpg`); en *baja*, un `MeshStandardMaterial` que refleja el entorno y desplaza la normal para simular la corriente |
| Bosque | `bosque.js` | Cada `.glb` se carga con `GLTFLoader` y cada pieza (tronco, copa…) se vuelve un `InstancedMesh`: una llamada de dibujo para cientos de árboles. La colocación usa azar con semilla, así el bosque sale igual siempre |
| Pasto | `bosque.js` | Manojos de 9 hojas generados en código, en un `InstancedMesh` con color por ejemplar |
| Viento | `bosque.js` | Uniforme `viento` compartido: el *vertex shader* mece el pasto y las copas según la altura de cada vértice |
| Luciérnagas y polen | `bosque.js` | Dos `Points` con brillo aditivo que flotan alrededor de la cámara y reaparecen del otro lado si la persona se aleja |
| Flores y hongos | `bosque.js` | Modelos de Kenney en `InstancedMesh`, en manchas por el prado y al pie de los árboles |
| Animales | `vida.js` | Zorro, pájaro y pez de Quaternius, cada uno con su `AnimationMixer` y clonados con `SkeletonUtils.clone`. Los zorros pasean por el claro y se apartan si la persona se acerca, las bandadas giran sobre el río y los peces saltan cerca de la persona, con una onda en el agua y un chapoteo |
| Mariposas | `vida.js` | Un solo `InstancedMesh`; el aleteo está en el *vertex shader* |
| Fogata | `vida.js` | Troncos y piedras de Kenney, llamas (sprites aditivos), chispas (`Points`) y una `PointLight` que titila. Es un obstáculo para el jugador |
| `world` | `app.js` | Grupo con todo el escenario; se oculta en AR para que solo quede la guía |

## Guía de respiración (`guia.js`)

- **Pantalla:** un panel (`#guia`) a la izquierda, centrado en vertical, con un SVG: cabeza, torso, dos brazos que giran desde el hombro y dos pulmones con tráquea. El valor de la respiración (0 = vacío, 1 = lleno, con la misma curva `ease()` de antes) escala los pulmones y gira los brazos hasta 150°. Debajo van los segundos que quedan y la frase `PROTOCOL.cuerpo[fase]`. Solo se ve durante la cuenta atrás y la sesión.
- **Minimizar:** el botón **–** lo deja como un círculo de 74 px que sigue respirando; se abre de nuevo con un toque. La preferencia se guarda en `localStorage["respira-guia-min"]`.
- **VR/AR:** el DOM no se ve dentro de las gafas, así que `crearGuiaXR` dibuja los mismos trazos (`Path2D` con las mismas cadenas SVG) en un `CanvasTexture`. Ese sprite flota a 2,2 m, girado 26° a la izquierda de la mirada y 45 cm por debajo de los ojos, para no tapar el frente.
- `PROTOCOL.brazos = false` deja los brazos quietos para quien no deba levantarlos.

## Movimiento (`controles.js`)

La cámara vive dentro de un `rig`, el "cuerpo". El `rig` se para sobre el suelo y la cámara queda a 1,6 m (los ojos). En VR la cabeza la mueve el visor y el código solo mueve el `rig`.

| Entrada | Cómo funciona |
|---|---|
| Mouse | Clic en el lienzo → `requestPointerLock`; `PointerLockControls` gira la cámara. Esc suelta el mouse (lo hace el navegador). Si el navegador no concede la captura, arrastrar también sirve |
| Teclado | `KeyboardEvent.code` (no depende del idioma del teclado): W A S D o flechas, Shift corre, Espacio salta, F alterna el vuelo; en vuelo, Espacio sube y Ctrl o C baja |
| Táctil | Joystick virtual (`#joy`); arrastrar en el resto de la pantalla mueve la vista; botones Saltar (Subir en vuelo), Correr, Volar y Bajar |
| VR | Palanca izquierda: caminar a 1,4 m/s. Palanca derecha: giro de 30° por pasos, alrededor de la cabeza. Sin correr, saltar ni volar |

Física sencilla: gravedad de 16 m/s², salto de 5,2 m/s y la altura del suelo sale de la misma función `altura(x, z)` que dibuja el terreno. Troncos y rocas grandes se guardan en una rejilla de 4 m y el jugador (radio de 0,3 m) se empuja fuera de ellos. En el río se camina más lento. El mundo caminable es un círculo de 150 m.

## Calidad (`calidad.js`)

`Q` reúne todos los números que cuestan rendimiento: resolución, antialias, sombras, segmentos del terreno, cantidad de árboles, helechos, rocas y pasto, partículas, tipo de agua, densidad de la niebla y escala del framebuffer en XR. El perfil se elige así: `?calidad=` en la dirección → `localStorage["respira-calidad"]` → automático (*baja* si el puntero es táctil o el navegador es de celular o de gafas). Al cambiarlo se recarga la página, para no reconstruir la escena en caliente.

En la prueba con Chromium headless (SwiftShader, sin GPU), el perfil *baja* dibuja unos 320 000 triángulos en 56 llamadas por cuadro. *Alta* suma unos 2,2 millones en 129 llamadas, contando la pasada de sombras y la del reflejo del agua. Pensado para la GPU de un computador.

## Otras piezas

| Sección | Qué hace |
|---|---|
| Sonido (`sonido.js`) | Río: ruido marrón grave + tres bandas de ruido con volumen y tono que oscilan (burbujeo). El volumen y el paneo dependen de la distancia y el lado del río. Pájaros: tres tipos de canto con osciladores, cada 1–4 s, con un eco corto. Fogata: soplo grave + chasquidos al azar, más fuerte de cerca. Chapoteo cuando salta un pez. Acorde de senos que sube al inhalar |
| Voz (`audio/voz.js`) | `speechSynthesis` en español, con la primera voz `es-*` disponible |
| Historial | `servicios/historial.js`: `localStorage["respira-hist"]`, máx. 30 registros `{t, pre, post, min}`. Es el único módulo que toca esos datos, para conectarlo luego con `backend/` |
| VR/AR | `navigator.xr.isSessionSupported` → `requestSession` con `local-floor` → `renderer.xr.setSession` |
| Depuración | `window.respira` expone `scene`, `camera`, `rig`, `jugador`, `renderer` y el estado, para las pruebas automáticas |

El bucle usa `renderer.setAnimationLoop`, que es obligatorio para WebXR: el visor marca el ritmo de cuadros.

## Decisiones para que sea apto para VR

- Unidades en metros y cámara a 1,6 m; en XR la altura la pone el visor (`local-floor`).
- En VR: paso lento, giro por pasos y nada de correr, saltar ni volar.
- Todo lo repetido va en `InstancedMesh`. Los modelos son livianos: los de Poly Haven se simplificaron y cuantizaron con glTF-Transform.
- En *baja*: sin sombras ni reflejo en tiempo real, menos plantas, `framebufferScaleFactor` de 0,8 y *foveation*.
- Ninguna acción indispensable depende del teclado.

## Pruebas

| Qué | Dónde | Comando |
|---|---|---|
| Ritmo de respiración y forma de `protocolo.js` | `tests/respiracion.test.js` | `npm test` |
| API (rutas, validación, límites) | `backend/test/api.test.js` | `npm test` |
| App completa en Chromium (escritorio y celular): carga sin errores, guía, movimiento, minimizar, guardar sesión | `scripts/prueba-navegador.mjs` | `npm run test:navegador` |

GitHub Actions (`.github/workflows/ci.yml`) corre lint, pruebas y la prueba en navegador en cada pull request, y guarda las capturas como artefacto.

Además, a mano, se probó con Playwright en Chromium headless, en escritorio (1280×800) y celular (Pixel 7 emulado), en ambas calidades: carga sin errores de consola ni peticiones fallidas, caminar, correr, saltar, volar, joystick, arrastrar para mirar, botones táctiles, sesión completa con escala antes y después, historial y aviso de VR no disponible. Las capturas de `docs/` salen de esas pruebas.

## Ideas para crecer

- **Mandos en VR:** el evento `select` de `renderer.xr.getController(0)` para responder la escala dentro de las gafas.
- **Árboles más realistas:** cambiar los `.glb` de Kenney por modelos CC0 con hojas de textura con transparencia, cuidando los polígonos para Quest.
- **Sonido con archivos:** grabaciones CC0 de río y pájaros en lugar del sonido sintetizado.
- **Giroscopio:** `DeviceOrientationEvent`; en iOS requiere `DeviceOrientationEvent.requestPermission()` desde un toque.
- **Varios ejercicios:** convertir `PROTOCOL` en un objeto por emoción (`ira`, `ansiedad`, …) y elegirlo en la pantalla de inicio.
- **Backend:** si se guardan datos en la nube, hacerlo con consentimiento y cifrado; son datos de salud.
