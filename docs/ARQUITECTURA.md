# Arquitectura (para desarrolladores)

Proyecto estático: HTML, CSS y JavaScript sin frameworks ni compilación. La única librería es **Three.js r170** (`three@0.170.0`), que se carga con un *import map* desde jsdelivr con la versión exacta. De sus ejemplos oficiales (`examples/jsm`) se usan `Sky`, `Water`, `PointerLockControls` y `GLTFLoader`. Necesita un servidor (aunque sea `python3 -m http.server`), porque los módulos ES no cargan desde `file://`.

## Orden de carga

```
index.html
 ├─ css/estilos.css
 ├─ <script type="importmap">  "three" y "three/addons/" → jsdelivr, three@0.170.0
 ├─ js/protocolo.js   (script clásico) → define PROTOCOL y WORDS (globales)
 └─ js/app.js         (módulo) → usa PROTOCOL y WORDS e importa:
     ├─ js/calidad.js    perfil "alta" o "baja" (Q)
     ├─ js/terreno.js    altura(x, z), cauce del río, terreno y agua
     ├─ js/bosque.js     modelos .glb en InstancedMesh, pasto, partículas, colisiones
     ├─ js/controles.js  clase Jugador: mouse/teclado, táctil y mandos VR
     └─ js/sonido.js     río, pájaros y acorde (Web Audio)
```

`js/protocolo.js` sigue siendo un script clásico y el único archivo que edita el psicólogo. Sus `const` de primer nivel son globales y el módulo `app.js` las lee directamente.

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

`phaseAt(t)` convierte los segundos transcurridos en `[fase, valor 0‥1, segundos restantes]` a partir de `PROTOCOL`. El valor pasa por `ease()` (coseno) y controla el tamaño del núcleo, el halo, el anillo y la luz del orbe. La sesión solo termina al final de una fase `rest`, para no cortar a mitad de una respiración.

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
| `world` | `app.js` | Grupo con todo el escenario; se oculta en AR para que solo quede el orbe |
| Orbe guía | `app.js` | Esfera + sprite con brillo + anillo + `PointLight`; sigue la mirada a 3 m con `lerp` suave |

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

En la prueba con Chromium headless (SwiftShader, sin GPU), el perfil *baja* dibuja unos 290 000 triángulos en 29 llamadas por cuadro. *Alta* suma unos 2 millones en 55 llamadas, contando la pasada de sombras y la del reflejo del agua. Pensado para la GPU de un computador.

## Otras piezas

| Sección | Qué hace |
|---|---|
| Sonido (`sonido.js`) | Río: ruido marrón grave + tres bandas de ruido con volumen y tono que oscilan (burbujeo). El volumen y el paneo dependen de la distancia y el lado del río. Pájaros: tres tipos de canto con osciladores, a intervalos al azar, con un eco corto. Acorde de senos que sube al inhalar |
| Voz | `speechSynthesis` en español, con la primera voz `es-*` disponible |
| Historial | `localStorage["respira-hist"]`, máx. 30 registros `{t, pre, post, min}` |
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

Se probó con Playwright en Chromium headless, en escritorio (1280×800) y celular (Pixel 7 emulado), en ambas calidades: carga sin errores de consola ni peticiones fallidas, caminar, correr, saltar, volar, joystick, arrastrar para mirar, botones táctiles, sesión completa con escala antes y después, historial y aviso de VR no disponible. Las capturas de `docs/` salen de esas pruebas.

## Ideas para crecer

- **Mandos en VR:** el evento `select` de `renderer.xr.getController(0)` para responder la escala dentro de las gafas.
- **Árboles más realistas:** cambiar los `.glb` de Kenney por modelos CC0 con hojas de textura con transparencia, cuidando los polígonos para Quest.
- **Sonido con archivos:** grabaciones CC0 de río y pájaros en lugar del sonido sintetizado.
- **Giroscopio:** `DeviceOrientationEvent`; en iOS requiere `DeviceOrientationEvent.requestPermission()` desde un toque.
- **Varios ejercicios:** convertir `PROTOCOL` en un objeto por emoción (`ira`, `ansiedad`, …) y elegirlo en la pantalla de inicio.
- **Backend:** si se guardan datos en la nube, hacerlo con consentimiento y cifrado; son datos de salud.
