# Créditos de los recursos

Todos los modelos y texturas de esta carpeta son de licencia **CC0** (dominio público), salvo la textura del agua, que viene con Three.js bajo licencia **MIT**. Se pueden usar, modificar y publicar sin pedir permiso. No es obligatorio dar crédito, pero lo damos igual.

Las texturas se redujeron a 1024 × 1024 px y se volvieron a comprimir en JPG. Los modelos de Poly Haven se empaquetaron en un solo `.glb` con [glTF-Transform](https://gltf-transform.dev/), con texturas de 512 px, menos polígonos y vértices cuantizados (`KHR_mesh_quantization`, que Three.js lee sin decodificadores extra).

## Texturas del terreno (`texturas/`)

| Archivo | Uso | Fuente | Licencia |
|---|---|---|---|
| `leafy_grass_diff_1k.jpg`, `leafy_grass_nor_1k.jpg` | Pasto (color y relieve) | [Leafy Grass, Poly Haven](https://polyhaven.com/a/leafy_grass) | CC0 |
| `forest_leaves_04_diff_1k.jpg` | Manchas de hojarasca | [Forest Leaves 04, Poly Haven](https://polyhaven.com/a/forest_leaves_04) | CC0 |
| `river_small_rocks_diff_1k.jpg` | Lecho y orilla del río | [River Small Rocks, Poly Haven](https://polyhaven.com/a/river_small_rocks) | CC0 |

El relieve (*normal map*) del pasto se usa en todo el terreno; así se ahorra cargar dos texturas más.

## Agua

| Archivo | Uso | Fuente | Licencia |
|---|---|---|---|
| `waternormals.jpg` | Ondas del río (`Water.js`) | [Ejemplos de Three.js r170, `examples/textures/waternormals.jpg`](https://github.com/mrdoob/three.js/blob/r170/examples/textures/waternormals.jpg) | MIT (© autores de three.js) |

## Modelos 3D (`modelos/`)

| Archivo | Uso | Fuente | Licencia |
|---|---|---|---|
| `fern_02.glb` | Helechos | [Fern 02, Poly Haven](https://polyhaven.com/a/fern_02) | CC0 |
| `rock_moss_set_01.glb` | Rocas con musgo (6 variantes) | [Rock Moss Set 01, Poly Haven](https://polyhaven.com/a/rock_moss_set_01) | CC0 |
| `tree_pineTallA_detailed.glb` | Pino alto | [Nature Kit 2.1, Kenney](https://kenney.nl/assets/nature-kit) | CC0 |
| `tree_pineDefaultA.glb` | Pino | Nature Kit 2.1, Kenney | CC0 |
| `tree_pineRoundA.glb` | Abeto de pisos | Nature Kit 2.1, Kenney | CC0 |
| `tree_oak.glb` | Roble | Nature Kit 2.1, Kenney | CC0 |
| `plant_bushDetailed.glb` | Arbustos | Nature Kit 2.1, Kenney | CC0 |
| `log.glb` | Troncos caídos | Nature Kit 2.1, Kenney | CC0 |
| `flower_yellowA.glb`, `flower_redA.glb`, `flower_purpleA.glb` | Flores del prado | Nature Kit 2.1, Kenney | CC0 |
| `mushroom_redGroup.glb` | Hongos | Nature Kit 2.1, Kenney | CC0 |
| `campfire_logs.glb`, `campfire_stones.glb` | Fogata | Nature Kit 2.1, Kenney | CC0 |

## Animales (`animales/`)

| Archivo | Uso | Fuente | Licencia |
|---|---|---|---|
| `zorro.glb` | Zorros que pasean (animación de caminar) | "Red Fox" de [Animals Pack, Quaternius (OpenGameArt)](https://opengameart.org/content/5-low-poly-animals) | CC0 |
| `pajaro.glb` | Bandadas (animación de vuelo) | "Bird" del mismo paquete | CC0 |
| `pez.glb` | Peces que saltan en el río | "Fish" del mismo paquete | CC0 |

Venían en FBX sin colores. Se convirtieron a `.glb` con `FBXLoader` y `GLTFExporter` de Three.js r170, con la animación incluida. Los colores se pintaron por vértice para que cada animal sea una sola llamada de dibujo.

A los modelos de Kenney se les cambian los colores en el código (`js/bosque.js`) para que se vean más naturales.

## Hecho en el código (sin archivos)

- **Pasto:** manojos de hojas finas generados en `js/bosque.js`.
- **Cielo:** `Sky.js` de los ejemplos oficiales de Three.js (cielo físico de Preetham).
- **Sonido:** río, pájaros, fogata, chapoteos y acorde sintetizados con Web Audio en `js/sonido.js`.
- **Mariposas, llamas y chispas:** geometría y texturas generadas en `js/vida.js`.
- **Guía de respiración (pulmones y figura):** dibujo SVG propio en `js/guia.js`.
