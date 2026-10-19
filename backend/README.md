# Backend de Respira (esqueleto)

API mínima en Node.js **sin dependencias externas** (`node:http`). Está lista para crecer, pero **todavía no se usa en producción ni guarda datos reales**: hoy el frontend guarda el historial solo en el navegador.

> ⚠️ **Datos de salud.** El nivel de ira de un paciente es un dato sensible (en Colombia, Ley 1581 de 2012). Antes de guardar datos reales hace falta, como mínimo: consentimiento informado, autenticación (que cada psicólogo vea solo a sus pacientes), HTTPS, cifrado en reposo, una base de datos con copias de seguridad y una política de retención. Ver la lista de pendientes al final.

## Uso

```bash
cd backend
cp .env.example .env      # opcional
npm start                 # http://localhost:3000/api/salud
npm test                  # pruebas con node:test
```

Desde la raíz del repo: `npm run backend` y `npm test`.

## Endpoints

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| GET | `/api/salud` | Saber si la API está viva | `200 { ok, servicio, version }` |
| GET | `/api/sesiones` | Últimas 30 sesiones, de la más reciente a la más antigua | `200 { sesiones: [...] }` |
| POST | `/api/sesiones` | Guardar una sesión `{ pre, post, min }` | `201 { sesion }` · `400` si los datos no son válidos · `413` si el cuerpo es muy grande · `415` si no es JSON |

`pre` y `post` son enteros de 0 a 10 (nivel de ira antes y después). `min` es un entero de 1 a 60 (duración).

## Estructura

```
backend/
├── src/
│   ├── servidor.js        Punto de entrada: crea el servidor y escucha el puerto
│   ├── app.js             Rutas, JSON, CORS, límites y manejo de errores
│   ├── config.js          Variables de entorno (PORT, ORIGEN_PERMITIDO)
│   ├── validacion.js      Reglas de los datos de entrada
│   ├── rutas/             Un archivo por recurso (salud, sesiones)
│   └── almacen/           Dónde se guardan los datos (hoy: memoria)
└── test/                  Pruebas de la API (node --test)
```

Reglas para que no se acumule deuda técnica:

- **Las rutas no saben dónde se guardan los datos.** Reciben un `almacen` con `listar()` y `agregar()`. Para usar una base de datos se crea `almacen/postgres.js` (o el que sea) con la misma interfaz y se cambia una línea en `servidor.js`.
- **Toda entrada se valida** en `validacion.js` antes de tocar el almacén.
- **Cada ruta nueva lleva su prueba** en `test/`.
- **La configuración viene del entorno** (`.env`), nunca escrita en el código. `.env` no se sube a GitHub.

## Para conectarlo con el frontend

El frontend usa `frontend/js/servicios/historial.js` para leer y guardar sesiones. Para usar la API, solo cambia ese archivo: `guardar()` hace `POST /api/sesiones` y `ultimas()` hace `GET /api/sesiones`. Conviene mantener `localStorage` como respaldo cuando no haya conexión.

## Pendiente antes de usar datos reales

- [ ] Autenticación y roles (paciente, psicólogo).
- [ ] Consentimiento informado registrado por paciente.
- [ ] Base de datos con cifrado en reposo y copias de seguridad.
- [ ] HTTPS y CORS restringido al dominio publicado.
- [ ] Registro de accesos (quién vio qué) y política de borrado.
- [ ] Límite de peticiones por IP.
