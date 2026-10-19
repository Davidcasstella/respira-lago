/* Punto de entrada: npm start (o npm run backend desde la raíz). */
import { createServer } from "node:http";
import { crearApp } from "./app.js";
import { crearAlmacenMemoria } from "./almacen/memoria.js";
import { config } from "./config.js";

const servidor = createServer(crearApp({ almacen: crearAlmacenMemoria(), config }));
servidor.listen(config.puerto, () => console.log(`API de Respira en http://localhost:${config.puerto}/api/salud`));
