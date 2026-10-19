/* Reglas de estilo y errores comunes. npm run lint */
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "dist/", "**/*.min.js"] },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error"
    }
  },
  {
    files: ["frontend/**/*.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.browser, PROTOCOL: "readonly", WORDS: "readonly" } }
  },
  {
    // Script clásico que define las globales del protocolo
    files: ["frontend/js/protocolo.js"],
    languageOptions: { sourceType: "script", globals: { PROTOCOL: "off", WORDS: "off" } },
    rules: { "no-unused-vars": "off" }
  },
  {
    files: ["backend/**/*.js", "scripts/**/*.mjs", "tests/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.node } }
  },
  {
    // El navegador de prueba ejecuta funciones dentro de la página
    files: ["scripts/prueba-navegador.mjs"],
    languageOptions: { globals: { ...globals.browser } }
  }
];
