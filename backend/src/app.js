/* Aplicación HTTP sin dependencias (node:http): rutas, JSON, CORS y errores en un solo lugar. */
import { salud } from "./rutas/salud.js";
import { listarSesiones, crearSesion } from "./rutas/sesiones.js";

const RUTAS = {
  "GET /api/salud": salud,
  "GET /api/sesiones": listarSesiones,
  "POST /api/sesiones": crearSesion
};

class ErrorHttp extends Error { constructor(estado, mensaje) { super(mensaje); this.estado = estado; } }

function leerCuerpo(req, limite) {
  return new Promise((resolver, rechazar) => {
    let datos = "", tam = 0;
    req.on("data", trozo => {
      tam += trozo.length;
      if (tam > limite) {
        // Se deja de guardar y se descarta el resto, para poder responder 413 antes de cerrar
        req.removeAllListeners("data"); req.resume();
        rechazar(new ErrorHttp(413, "El cuerpo es demasiado grande")); return;
      }
      datos += trozo;
    });
    req.on("end", () => resolver(datos));
    req.on("error", rechazar);
  });
}

/** Crea el manejador de peticiones. Recibe sus dependencias para poder probarlo con un almacén falso. */
export function crearApp({ almacen, config }) {
  return async (req, res) => {
    const cabeceras = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": config.origenPermitido,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Content-Type-Options": "nosniff"
    };
    const responder = (estado, cuerpo) => { res.writeHead(estado, cabeceras); res.end(cuerpo === undefined ? "" : JSON.stringify(cuerpo)); };
    try {
      if (req.method === "OPTIONS") return responder(204);
      const ruta = new URL(req.url, "http://local").pathname.replace(/\/+$/, "");
      const manejador = RUTAS[`${req.method} ${ruta}`];
      if (!manejador) return responder(404, { error: "Ruta no encontrada" });
      const leerJSON = async () => {
        if (!String(req.headers["content-type"] || "").includes("application/json")) throw new ErrorHttp(415, "Se espera Content-Type: application/json");
        try { return JSON.parse(await leerCuerpo(req, config.limiteCuerpo)); }
        catch (e) { if (e instanceof ErrorHttp) throw e; throw new ErrorHttp(400, "JSON mal formado"); }
      };
      await manejador({ req, almacen, responder, leerJSON });
    } catch (e) {
      if (e instanceof ErrorHttp) { if (e.estado === 413) cabeceras.Connection = "close"; return responder(e.estado, { error: e.message }); }
      console.error(e);
      responder(500, { error: "Error interno" });
    }
  };
}
