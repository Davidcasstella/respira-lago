# Cómo contribuir

Gracias por ayudar con Respira. Esta guía mantiene el proyecto ordenado y sin deuda técnica.

## Preparar el entorno

```bash
git clone https://github.com/Davidcasstella/respira-lago.git
cd respira-lago
npm install          # herramientas de desarrollo (ESLint, pruebas)
npm run dev          # frontend en http://localhost:8000
npm run backend      # API en http://localhost:3000 (opcional)
```

Necesitas Node.js 20 o superior (`.nvmrc` dice 22).

## Flujo de trabajo

1. Crea una rama desde `progra-2` con un nombre claro: `funcion/guia-voz`, `arreglo/salto-celular`, `docs/protocolo`.
2. Haz commits pequeños con un mensaje que explique el *qué* y el *por qué*. Primera línea en imperativo y en español, de menos de 72 caracteres:
   - `Agrega bandada de pájaros sobre el río`
   - `Corrige el salto en celulares con pantalla pequeña`
3. Antes de subir: `npm run verificar` (lint + pruebas). Si tocaste la escena o los controles, también `npm run test:navegador`.
4. Abre un pull request hacia `progra-2` y llena la plantilla. GitHub corre las mismas pruebas automáticamente (CI).
5. Los cambios en `frontend/js/protocolo.js` necesitan el visto bueno del psicólogo responsable.

## Reglas del código

Están en [docs/BUENAS-PRACTICAS.md](docs/BUENAS-PRACTICAS.md). Las más importantes:

- El contenido terapéutico vive **solo** en `frontend/js/protocolo.js`.
- Un módulo por responsabilidad, dentro de su carpeta (`escena/`, `controles/`, `audio/`, `sesion/`, `servicios/`, `config/`).
- Recursos nuevos: CC0 (o licencia compatible), livianos y anotados en `frontend/assets/CREDITOS.md`.
- Nada de datos de pacientes, claves ni `.env` en el repositorio.
