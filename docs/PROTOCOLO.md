# Guía del protocolo (para el psicólogo)

Esta guía explica cómo cambiar el ejercicio **sin saber programar**. Todo se hace en un solo archivo: [`frontend/js/protocolo.js`](../frontend/js/protocolo.js).

## Editarlo desde GitHub

1. Abre el archivo `frontend/js/protocolo.js` en GitHub.
2. Toca el ícono del lápiz (**Edit this file**).
3. Cambia solo los números o los textos que están entre comillas.
4. Abajo, toca **Commit changes**. GitHub revisa solo el archivo (pestaña *Actions*): si quedó una coma o comilla mal puesta, aparece una ✗ roja y, al abrirla, se ve en qué línea está el error.
5. Si el sitio está publicado, se actualiza en uno o dos minutos.

Reglas para no romper nada:
- Los textos van siempre entre comillas: `"Toma aire"`.
- No borres las comas `,` ni los corchetes `[ ]` y llaves `{ }`.
- Los tiempos son **segundos** y pueden tener decimales con punto: `4.5`.

## Los tiempos

```js
inhale: 4,   // toma aire  (los pulmones de la guía se llenan)
hold:   1,   // sostiene con aire
exhale: 6,   // suelta     (los pulmones se vacían)
rest:   1,   // descansa sin aire
```

Un ciclo dura la suma de los cuatro valores. Con 4 + 1 + 6 + 1 = 12 s salen **5 respiraciones por minuto**.

Si no quieres usar una fase, ponla en `0`. No pongas `inhale` ni `exhale` en `0`.

### Ritmos de ejemplo

Son ejemplos de ritmos conocidos. El psicólogo decide cuál conviene en cada caso.

| Ritmo | inhale | hold | exhale | rest | Respiraciones/min |
|---|---|---|---|---|---|
| Actual (exhalación larga) | 4 | 1 | 6 | 1 | 5 |
| Coherente / resonante | 5 | 0 | 5 | 0 | 6 |
| 4‑7‑8 | 4 | 7 | 8 | 0 | ≈3,2 |
| Cuadrada (box breathing) | 4 | 4 | 4 | 4 | ≈3,8 |
| Suave para empezar | 3 | 0 | 5 | 1 | ≈6,7 |

## Los textos en pantalla

```js
cues: {
  inhale: ["Toma aire", "Por la nariz, despacio, mientras se llenan los pulmones"],
  hold:   ["Sostén", "Un instante"],
  exhale: ["Suelta", "Por la boca, más lento, deja ir la tensión"],
  rest:   ["Descansa", "Nota cómo se afloja el cuerpo"]
},
```

Cada fase tiene dos textos: **[título grande, frase pequeña]**. Conviene que el título sea corto (una o dos palabras), porque en VR se lee de lejos.

## Los brazos y el cuerpo

```js
brazos: true,
cuerpo: {
  inhale: "Sube los brazos despacio, con las palmas hacia arriba, mientras llenas los pulmones",
  hold:   "Brazos arriba, hombros sueltos",
  exhale: "Baja los brazos poco a poco mientras sueltas el aire",
  rest:   "Manos sobre el abdomen, nota cómo se mueve"
}
```

La guía de respiración muestra una figura con unos pulmones que se llenan y se vacían al ritmo de las fases. Si `brazos` es `true`, la figura sube los brazos al tomar aire y los baja al soltarlo, y debajo aparece la frase de `cuerpo` de esa fase. Si un paciente no puede o no debe levantar los brazos, pon `brazos: false`: la figura deja los brazos quietos y debajo aparece la frase pequeña de `cues`.

La persona puede minimizar la guía con el botón **–**. Queda como un círculo pequeño que sigue respirando, y se abre de nuevo con un toque.

## La voz guía

```js
voice: { inhale: "Toma aire", exhale: "Suelta despacio" }
```

La voz habla al empezar cada fase que aparezca aquí. Para que también hable al sostener, agrega `hold: "Sostén"`. Frases cortas funcionan mejor: si la frase dura más que la fase, se corta.

La voz usa la que tenga instalada el teléfono o el computador, así que puede sonar distinta en cada uno. Para una voz humana y cálida, lo ideal es grabarla (está en los próximos pasos del README).

## La escala de ira

```js
const WORDS = ["nada", "casi nada", "muy poca", "poca", "algo", "moderada",
               "bastante", "mucha", "muy alta", "intensa", "máxima"];
```

Son las palabras que acompañan cada número de 0 a 10, en orden. Deben ser **exactamente 11**.

## Frases fijas

Algunas frases están en `frontend/index.html` y `frontend/js/app.js`: el saludo inicial ("Ponte cómodo. Vamos a respirar juntos."), el cierre ("Muy bien. Tómate un momento antes de volver.") y los mensajes del resultado. Si quieres cambiarlas, pídeselo al desarrollador o búscalas con *Ctrl+F* en esos archivos.
