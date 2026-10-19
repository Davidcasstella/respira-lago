/* GET /api/salud — para saber si la API está viva (monitoreo, despliegues). */
export const salud = ({ responder }) => responder(200, { ok: true, servicio: "respira-backend", version: "0.1.0" });
