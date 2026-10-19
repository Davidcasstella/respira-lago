/* Validación de datos de entrada. Devuelve { ok, valor } o { ok: false, errores }. */
const entero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** Una sesión de respiración: nivel de ira antes y después (0–10) y duración en minutos (1–60). */
export function validarSesion(cuerpo) {
  const errores = [];
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return { ok: false, errores: ["El cuerpo debe ser un objeto JSON"] };
  const { pre, post, min } = cuerpo;
  if (!entero(pre, 0, 10)) errores.push("pre debe ser un entero de 0 a 10");
  if (!entero(post, 0, 10)) errores.push("post debe ser un entero de 0 a 10");
  if (!entero(min, 1, 60)) errores.push("min debe ser un entero de 1 a 60");
  return errores.length ? { ok: false, errores } : { ok: true, valor: { pre, post, min } };
}
