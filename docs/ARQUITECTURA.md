# Arquitectura (para desarrolladores)

Proyecto estático: HTML, CSS y JavaScript sin frameworks ni compilación. Se carga una sola librería, Three.js r128, desde cdnjs.

## Orden de carga

```
index.html
 ├─ css/estilos.css
 ├─ three.min.js  (cdnjs, r128)
 ├─ js/protocolo.js   → define PROTOCOL y WORDS (globales)
 └─ js/app.js         → usa THREE, PROTOCOL y WORDS
```

## Pantallas

`index.html` tiene un `<canvas id="scene">` a pantalla completa y tres capas (`.layer`) encima; solo una se ve a la vez (`show(id)` en `app.js`):

| id | Contenido |
|---|---|
| `#start` | Escala antes, duración, botones Comenzar / VR / AR |
| `#session` | Fase actual, progreso, cruceta de movimiento, botones de sonido, voz y terminar |
| `#end` | Escala después, resultado, historial, repetir o quedarse |

## Estados de la sesión

```
idle ──Comenzar──▶ countin (3 s) ──▶ running ──fin de tiempo / Terminar──▶ done
  ▲                                                                       │
  └────────────────────────── Repetir ◀──────────────────────────────────┘
                                         done ──Quedarme──▶ free
```

`phaseAt(t)` convierte los segundos transcurridos en `[fase, valor 0‥1, segundos restantes]` a partir de `PROTOCOL`. El valor pasa por `ease()` (coseno) y controla el tamaño del núcleo, el halo, el anillo y la luz del orbe. La sesión solo termina al final de una fase `rest`, para no cortar a mitad de una respiración.

## Escena 3D (secciones de `app.js`)

| Sección | Qué hace |
|---|---|
| Escena | Cámara dentro de un `rig` (cuerpo del jugador); cielo con shader de degradado, sol, agua con olas por vértices, colinas y pinos *low-poly*, luciérnagas (`Points`) |
| `world` | Grupo con todo el escenario; se oculta en AR para que solo quede el orbe |
| Orbe guía | Esfera + sprite con brillo + anillo + `PointLight`; sigue la mirada a 3 m con `lerp` suave |
| Controles | Arrastre (pointer events) para yaw/pitch; cruceta y teclado para avanzar y girar; límite circular en la orilla |
| Sonido | Web Audio: ruido marrón filtrado con LFO (olas) + acorde de senos cuyo volumen sube al inhalar |
| Voz | `speechSynthesis` en español, con la primera voz `es-*` disponible |
| Historial | `localStorage["respira-hist"]`, máx. 30 registros `{t, pre, post, min}` |
| VR/AR | `navigator.xr.isSessionSupported` → `requestSession` con `local-floor` → `renderer.xr.setSession` |

El bucle usa `renderer.setAnimationLoop`, que es obligatorio para WebXR: el visor marca el ritmo de cuadros.

## Decisiones para que sea apto para VR

- Unidades en metros y cámara a 1,6 m; en XR la altura la pone el visor.
- Velocidades bajas (1,4 m/s, 0,9 rad/s) y sin aceleraciones bruscas.
- Pocos polígonos, `flatShading` y `pixelRatio` máximo de 2, para sostener 72–90 fps en gafas autónomas.
- Ninguna acción depende del teclado.

## Ideas para crecer

- **Modelos propios (.glb):** agregar `GLTFLoader` (ejemplos de Three r128) y cargar los modelos dentro de `world`. Mantenerlos livianos (< 5 MB, texturas de 1024 px).
- **Mandos en VR:** `renderer.xr.getController(0)` y el evento `select` para responder la escala dentro de las gafas.
- **Giroscopio:** `DeviceOrientationEvent`; en iOS requiere `DeviceOrientationEvent.requestPermission()` desde un toque.
- **Varios ejercicios:** convertir `PROTOCOL` en un objeto por emoción (`ira`, `ansiedad`, …) y elegirlo en la pantalla de inicio.
- **Backend:** si se guardan datos en la nube, hacerlo con consentimiento y cifrado; son datos de salud.
