# Clasificador Bayes Ingenuo (HTML + CSS + JavaScript)

## Estructura
- `index.html`: interfaz.
- `css/estilos.css`: estilos.
- `js/utilidades.js`: helpers y estado global (dataset cargado).
- `js/csv_validacion.js`: lectura del CSV, validación del dataset y detección de tipos.
- `js/aleatorio.js`: generador aleatorio con semilla (resultados reproducibles).
- `js/modelo.js`: `fit` (entrenamiento, binning, Laplace, normal) y `predict`.
- `js/metricas.js`: matriz de confusión, precisión, recall, especificidad, F1, accuracy.
- `js/app.js`: validación de parámetros, validación simple/estratificada/cruzada/externa y eventos.

Formato del CSV: encabezado en la primera línea, atributos en las primeras columnas y la clase en la ultima.
