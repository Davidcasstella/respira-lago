# Respira — guía rápida para asistentes de código

- Lee primero `docs/BUENAS-PRACTICAS.md` (estructura, estilo, rendimiento, datos) y `docs/ARQUITECTURA.md`.
- `frontend/` es un sitio estático sin compilación; Three.js r170 entra por *import map* con versión exacta.
- `frontend/js/protocolo.js` es el único archivo de contenido terapéutico: no le agregues lógica ni cambies sus claves.
- Verifica antes de terminar: `npm run verificar` (lint + pruebas). Si tocas la escena, la UI o los controles: `npm run test:navegador`.
- Recursos nuevos: CC0 y anotados en `frontend/assets/CREDITOS.md`.
- Nunca subas `.env`, claves ni datos de pacientes.
