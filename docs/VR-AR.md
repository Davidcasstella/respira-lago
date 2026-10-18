# XR, VR y AR

## Las diferencias, en simple

| | Qué ve la persona | Con qué se usa |
|---|---|---|
| **VR – realidad virtual** | Solo el mundo virtual. El cuarto real desaparece por completo. | Gafas como Meta Quest, Pico o PlayStation VR2 (esta última no tiene navegador). |
| **AR – realidad aumentada** | Su cuarto real con objetos virtuales encima. | Celular Android con Chrome, o gafas con cámara a color (*passthrough*) como Quest 3. |
| **XR – realidad extendida** | No es una tecnología aparte: es el nombre que agrupa VR y AR. | — |

El estándar web se llama **WebXR**. Con un mismo código, la página puede pedir una sesión `immersive-vr` o `immersive-ar`, y eso hace este proyecto con sus dos botones.

## Por qué VR para la ira

- **Aísla:** la persona sale del lugar y de los estímulos que la alteraron. La AR la deja en el mismo cuarto, con todo a la vista.
- **Control del entorno:** en VR se controla todo lo que ve y oye (luz cálida, agua, sonido bajo). En AR el fondo es lo que haya.
- **Inmersión:** la sensación de "estar en otro lugar" ayuda a cortar el ciclo de pensamientos que alimenta la ira.

La AR sí sirve para un uso más ligero: tener la guía de respiración flotando en el escritorio para una pausa rápida durante el día, sin aislarse.

## Compatibilidad (octubre de 2026)

| Dispositivo | Navegador | Modo web | VR | AR |
|---|---|---|---|---|
| Computador (Windows, Mac, Linux) | Chrome, Edge, Firefox, Safari | ✅ | Solo con visor conectado al PC | ❌ |
| Android | Chrome | ✅ | Limitado | ✅ |
| iPhone / iPad | Safari, Chrome | ✅ | ❌ | ❌ |
| Meta Quest 2 / 3 / 3S / Pro | Navegador de Meta | ✅ | ✅ | ✅ (en Quest 3/3S/Pro, con passthrough a color) |
| Pico 4 | Navegador de Pico | ✅ | ✅ | Parcial |
| Apple Vision Pro | Safari | ✅ | Limitado, probar | Limitado, probar |

Antes de comprar gafas para pacientes, conviene probar el enlace publicado en el dispositivo real.

## Requisitos para que funcionen los botones VR/AR

1. La página debe abrirse con **https** (GitHub Pages, Netlify y Vercel ya lo dan). `localhost` también vale para pruebas.
2. El navegador debe tener WebXR. Si no lo tiene, la página muestra un aviso y se puede seguir usando en modo normal.
3. La sesión inmersiva tiene que empezar con un toque del usuario (una norma de los navegadores), por eso existen los botones.

## Qué cambia dentro de las gafas

- **La cabeza mueve la vista:** el arrastre con el dedo deja de usarse.
- **La sesión empieza sola** al entrar, con el nivel de ira que se marcó antes.
- **La guía de los pulmones** flota abajo y a la izquierda de la mirada, para no tapar el frente.
- **En AR** se ocultan el cielo, el río y el bosque, y solo queda la guía de respiración en el cuarto real.
- La escena usa **metros reales**: los ojos a 1,6 m y la altura real la toma el visor (`local-floor`).

## Comodidad y seguridad en VR

- Para evitar mareo (*cybersickness*) se camina despacio con la palanca izquierda (1,4 m/s), se gira por pasos de 30° con la derecha y en VR se desactivan correr, saltar y volar.
- Si las gafas van lentas, se elige **Baja** en el selector de calidad de la pantalla de inicio: quita sombras y reflejos y pone menos plantas.
- Sesiones cortas, de 1 a 5 minutos, sobre todo al principio.
- Recomendar usarlo **sentado** y en un espacio despejado.
- Algunas personas con epilepsia fotosensible, vértigo o ciertas condiciones no deberían usar VR; esto lo evalúa el profesional.
