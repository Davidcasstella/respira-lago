/* Configuración leída de variables de entorno, con valores por defecto para desarrollo. */
export const config = {
  puerto: Number(process.env.PORT) || 3000,
  origenPermitido: process.env.ORIGEN_PERMITIDO || "http://localhost:8000",
  limiteCuerpo: 10 * 1024          // bytes: las peticiones son pequeñas
};
