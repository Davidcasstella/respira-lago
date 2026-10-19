/* =====================================================================
   PROTOCOLO DE RESPIRACIÓN — archivo pensado para que lo ajuste el psicólogo
   ---------------------------------------------------------------------
   Aquí está todo el contenido terapéutico del ejercicio: los tiempos de
   cada fase y las frases que se ven y se escuchan. No hace falta tocar
   ningún otro archivo para cambiar el ejercicio.

   Cómo funciona un ciclo:
     inhale (toma aire) -> hold (sostiene) -> exhale (suelta) -> rest (descansa)
   y se repite hasta que se acaba la duración elegida (1, 3 o 5 minutos).

   Con los valores por defecto un ciclo dura 4 + 1 + 6 + 1 = 12 segundos,
   es decir, 5 respiraciones por minuto. La exhalación es más larga que la
   inhalación a propósito: ayuda a bajar la activación del cuerpo.

   Los valores están en SEGUNDOS. Si una fase no se quiere usar, ponla en 0.
   ===================================================================== */
const PROTOCOL = {
  inhale: 4,     // segundos tomando aire (los pulmones de la guía se llenan)
  hold: 1,       // pausa breve con los pulmones llenos
  exhale: 6,     // segundos soltando el aire (los pulmones se vacían)
  rest: 1,       // pausa breve con los pulmones vacíos

  // Texto en pantalla de cada fase: [título grande, frase pequeña]
  cues: {
    inhale: ["Toma aire", "Por la nariz, despacio, mientras se llenan los pulmones"],
    hold:   ["Sostén", "Un instante"],
    exhale: ["Suelta", "Por la boca, más lento, deja ir la tensión"],
    rest:   ["Descansa", "Nota cómo se afloja el cuerpo"]
  },

  // Lo que dice la voz guía al empezar cada fase.
  // Si una fase no aparece aquí, la voz se queda en silencio en esa fase.
  voice: { inhale: "Toma aire", exhale: "Suelta despacio" },

  // Qué hacer con el cuerpo en cada fase. Aparece en la guía de los pulmones,
  // donde una figura sube y baja los brazos. Para no usar los brazos, pon brazos: false.
  brazos: true,
  cuerpo: {
    inhale: "Sube los brazos despacio, con las palmas hacia arriba, mientras llenas los pulmones",
    hold:   "Brazos arriba, hombros sueltos",
    exhale: "Baja los brazos poco a poco mientras sueltas el aire",
    rest:   "Manos sobre el abdomen, nota cómo se mueve"
  }
};

// Palabras que acompañan cada número de la escala de ira (posición 0 a 10).
const WORDS = ["nada", "casi nada", "muy poca", "poca", "algo", "moderada",
               "bastante", "mucha", "muy alta", "intensa", "máxima"];
