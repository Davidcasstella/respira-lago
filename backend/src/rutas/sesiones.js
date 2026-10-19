/* /api/sesiones — historial de sesiones de respiración. */
import { validarSesion } from "../validacion.js";

export const listarSesiones = async ({ almacen, responder }) => responder(200, { sesiones: await almacen.listar() });

export async function crearSesion({ almacen, responder, leerJSON }) {
  const cuerpo = await leerJSON();
  const r = validarSesion(cuerpo);
  if (!r.ok) return responder(400, { error: "Datos inválidos", detalles: r.errores });
  return responder(201, { sesion: await almacen.agregar(r.valor) });
}
