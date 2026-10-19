/* Almacén en memoria: se borra al reiniciar el servidor.
   Sirve para desarrollo y pruebas. Para datos reales hay que cambiarlo por una base de datos
   con cifrado y control de acceso (ver backend/README.md). Cualquier almacén nuevo debe
   cumplir esta misma interfaz: listar() y agregar(sesion). */
export function crearAlmacenMemoria() {
  const sesiones = [];
  let siguienteId = 1;
  return {
    async listar() { return sesiones.slice(-30).reverse(); },
    async agregar(sesion) {
      const registro = { id: siguienteId++, t: Date.now(), ...sesion };
      sesiones.push(registro);
      return registro;
    }
  };
}
