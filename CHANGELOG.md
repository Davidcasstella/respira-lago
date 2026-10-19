# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones con [SemVer](https://semver.org/lang/es/).

## [0.3.0] — 2026-10-19

### Agregado
- Estructura `frontend/` y `backend/` con documentación de cada parte.
- Backend esqueleto en Node sin dependencias: `/api/salud` y `/api/sesiones`, con validación y pruebas.
- Pruebas unitarias del ritmo de respiración y validación de `protocolo.js`.
- Prueba de humo en Chromium (escritorio y celular) con Playwright.
- ESLint, EditorConfig, CI en GitHub Actions, Dependabot, plantillas de issues y pull requests, CODEOWNERS.
- Publicación en Vercel (`vercel.json`) y GitHub Pages (flujo manual).
- `npm run build:archivo`: un solo HTML para abrir con doble clic.

### Cambiado
- `app.js` se divide: ritmo (`sesion/respiracion.js`), voz (`audio/voz.js`) e historial (`servicios/historial.js`).

## [0.2.0] — 2026-10-18

### Agregado
- Guía de respiración con pulmones y brazos, minimizable; versión flotante en VR/AR.
- Zorros, pájaros, peces, mariposas, flores, hongos y una fogata.

### Cambiado
- Luz de hora dorada y bruma cálida.

## [0.1.0] — 2026-10-18

### Agregado
- Bosque con río (Three.js r170, Sky, Water, recursos CC0), movimiento estilo juego, controles táctiles, selector de calidad.
