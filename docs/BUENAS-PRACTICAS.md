# Buenas prácticas del proyecto

Reglas acordadas para que Respira siga siendo fácil de cambiar. Si una regla estorba, se discute en un pull request y se actualiza aquí; no se rompe en silencio.

## 1. Estructura: cada cosa en su lugar

```
respira-lago/
├── frontend/              Lo que se publica (sitio estático, sin compilación)
│   ├── index.html
│   ├── css/
│   ├── js/
│   │   ├── protocolo.js   Contenido terapéutico (lo edita el psicólogo)
│   │   ├── app.js         Arranque: une los módulos, pantallas y bucle principal
│   │   ├── config/        Ajustes (calidad gráfica)
│   │   ├── escena/        Terreno, río, bosque, animales: todo lo 3D del mundo
│   │   ├── controles/     Mouse, teclado, táctil y mandos de VR
│   │   ├── audio/         Sonido ambiente y voz guía
│   │   ├── sesion/        Ritmo de respiración y guía visual
│   │   └── servicios/     Datos: historial (hoy localStorage, mañana la API)
│   └── assets/            Texturas, modelos y CREDITOS.md
├── backend/               API (esqueleto), con sus pruebas
├── tests/                 Pruebas unitarias del frontend (node --test)
├── scripts/               Servidor local, prueba en navegador, empaquetado
└── docs/                  Documentación para personas
```

- **Una responsabilidad por módulo.** Si un archivo pasa de ~300 líneas o hace dos cosas, se divide.
- **`app.js` solo orquesta.** La lógica va en su módulo; `app.js` la importa y la conecta con la pantalla.
- **Las dependencias van en una dirección:** `app.js` → módulos. Los módulos no importan `app.js`.
- **La lógica pura no toca el DOM ni Three.js** (ejemplo: `sesion/respiracion.js`). Así se puede probar en Node.

## 2. Contenido terapéutico

- Tiempos, frases, voz e instrucciones de cuerpo viven **solo** en `frontend/js/protocolo.js`.
- Ese archivo es un script clásico con datos, sin lógica, para que se pueda editar desde GitHub sin saber programar.
- La prueba `tests/respiracion.test.js` valida su forma (fases, frases, 11 palabras de la escala). Si el psicólogo rompe una coma, la CI lo avisa.
- Todo cambio clínico necesita el visto bueno del psicólogo (CODEOWNERS y plantilla de PR).

## 3. Nombres y estilo

- Código, comentarios y documentación **en español**, con nombres descriptivos (`crearBosque`, `rioAncho`). Las propiedades del protocolo (`inhale`, `exhale`…) se dejan en inglés para no romper lo que ya editó el psicólogo.
- `const` por defecto; `let` solo si cambia; nunca `var`.
- Comentarios para el *por qué*, no para el *qué*.
- El formato lo fija `.editorconfig` (2 espacios, LF, UTF-8) y los errores comunes los atrapa ESLint (`npm run lint`).

## 4. Datos y privacidad

- Todo acceso a datos pasa por `frontend/js/servicios/`. Ningún otro módulo usa `localStorage` para datos del paciente (las preferencias como la calidad o la guía minimizada sí pueden).
- Lo que venga de `localStorage` o de la red **se valida o se convierte** antes de mostrarlo (por ejemplo, `Number()` antes de `innerHTML`).
- En el backend toda entrada pasa por `validacion.js` y hay límites de tamaño.
- Nunca se suben `.env`, claves ni datos reales de pacientes. Ver `backend/README.md` para lo que falta antes de guardar datos reales.

## 5. Rendimiento (celular y Quest)

- Todo lo que se repite va en `InstancedMesh` (una llamada de dibujo por pieza).
- Cada número que cuesta rendimiento vive en `config/calidad.js`, con valor para *alta* y para *baja*. No se escriben cantidades sueltas en los módulos.
- Presupuesto aproximado en calidad *baja*: menos de 400 000 triángulos y menos de 80 llamadas de dibujo por cuadro (hoy: ~320 000 y 56).
- En VR se mantiene la comodidad: sin correr, saltar ni volar, giro por pasos y la guía fuera del centro.

## 6. Recursos (texturas, modelos, sonidos)

- Solo CC0 o licencias compatibles. **Cada archivo** se anota en `frontend/assets/CREDITOS.md` con su fuente y su licencia.
- Texturas de 1K como máximo y en JPG. Modelos `.glb` pequeños (idealmente < 300 KB), simplificados y cuantizados con glTF-Transform.
- No se usan decodificadores extra (Draco, KTX2) mientras no hagan falta.

## 7. Dependencias

- El frontend no tiene dependencias instaladas: Three.js se carga por *import map* con **versión exacta**. Para actualizarla se cambia en `index.html` y se prueba.
- El backend usa solo módulos de Node. Antes de agregar una librería, preguntar si de verdad hace falta.
- Las herramientas de desarrollo (ESLint, Playwright, esbuild) van en `devDependencies` con `package-lock.json`. Dependabot avisa una vez al mes.

## 8. Pruebas y CI

| Qué | Comando | Cuándo |
|---|---|---|
| Estilo y errores comunes | `npm run lint` | Siempre |
| Pruebas unitarias (frontend y backend) | `npm test` | Siempre |
| Las dos anteriores juntas | `npm run verificar` | Antes de cada push |
| Navegador real (escritorio y celular) | `npm run test:navegador` | Si cambia la escena, la UI o los controles |

GitHub Actions corre las tres en cada pull request. **No se fusiona un PR con la CI en rojo.**

- Lógica nueva → prueba unitaria nueva.
- Ruta nueva en el backend → prueba en `backend/test/`.
- Error corregido → una prueba que lo habría atrapado, si se puede.

## 9. Git y GitHub

- `progra-2` es la rama principal y siempre funciona. Nadie hace push directo con cambios grandes: rama + pull request.
- Ramas: `funcion/…`, `arreglo/…`, `docs/…`, `recursos/…`.
- Commits pequeños, en español e imperativo: "Agrega…", "Corrige…".
- Cada versión publicada se anota en `CHANGELOG.md`.

## 10. Revisiones con Claude Code

Antes de abrir un PR grande se puede pedir en Claude Code:

- `/code-review`: busca errores en los cambios.
- `/simplify`: propone limpiezas (código repetido, partes que sobran).
- `/security-review`: revisa seguridad. Úsalo sobre todo cuando se toque el backend o los datos.
