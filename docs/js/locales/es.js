/** Spanish UI catalog for the textbook adapter. */

export const es = {
  "header.title": "Adaptador de libros de texto",
  "header.skip": "Saltar al contenido principal",
  "header.eyebrow": "Preparación accesible de libros de texto",
  "header.lede":
    "Suelta un PDF de libro de texto escaneado, pega una clave de API de Gemini y descarga markdown accesible para lectores de pantalla. La clave permanece en esta sesión del navegador y solo se envía a Google Gemini, o a un proxy opcional que configures.",

  "toolbar.displayOptions": "Opciones de visualización",
  "toolbar.language": "Idioma",
  "toolbar.darkMode": "Modo oscuro",
  "header.languageHint":
    "Gemini hace las preguntas de aclaración en este idioma y marca las palabras ilegibles en este idioma. El texto de la lección impresa se mantiene en el idioma del libro.",

  "form.geminiAccess": "Acceso a Gemini",
  "form.apiKey": "Clave de API de Gemini",
  "form.apiKeyHint":
    'Crea una clave de API de Gemini en <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Hace falta para adaptar. No se guarda en el disco. El almacenamiento de sesión se usa solo si marcas la casilla de abajo.',
  "form.setupSummary": "Cómo conectar Gemini 3.8 Flash",
  "form.setupStep1":
    'Abre <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">las claves de API de Google AI Studio</a> e inicia sesión con la cuenta de Google que se facturará.',
  "form.setupStep2":
    "Crea una clave de API en un proyecto de Google Cloud. Si se te pide, habilita la <strong>API de Gemini</strong> (Generative Language API) para ese proyecto.",
  "form.setupStep3":
    "Pega la clave en el campo de arriba. Deja <strong>Modelo</strong> en Gemini 3.8 Flash. El id de la API de Google es <code>gemini-3.8-flash</code>.",
  "form.setupStep4":
    "No escribas nombres de Cursor como <code>gemini-3.8-flash-medium</code> en Modelo personalizado. Esos no son ids válidos de la API de Google.",
  "form.setupStep5":
    "Si esta página no puede llegar a Google desde el navegador, ejecuta <code>python3 scripts/serve_adapter.py</code> y configura el proxy en <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "Recordar la clave en esta sesión",
  "form.model": "Modelo",
  "form.modelHint": "Usa Gemini 3.8 Flash salvo que una clave antigua no pueda llamar a ese modelo.",
  "form.customModel": "Modelo personalizado",
  "form.batchSize": "Tamaño de lote preferido",
  "form.latexMath": "Envolver las matemáticas en LaTeX (para Nemeth)",
  "form.latexHint":
    "Desactivado por defecto: las matemáticas se leen como texto sencillo. Si lo marcas, Gemini envuelve las matemáticas en LaTeX para poder convertirlas después a Nemeth.",
  "form.advanced": "Avanzado: URL de proxy opcional",
  "form.proxyUrl": "URL del proxy",
  "form.proxyHint":
    "Déjalo en blanco para llamar a Google Gemini desde este navegador. Configura un proxy si esta página no puede llegar a Google, usando un host que reenvíe generateContent.",
  "form.pdfLegend": "PDF del libro de texto",
  "form.dropLead": "Suelta aquí un PDF de libro de texto",
  "form.dropOr": "o",
  "form.pdfFile": "Archivo PDF",
  "form.noFile": "No hay ningún archivo cargado.",
  "form.planBatches": "Planificar lotes",
  "form.adaptBook": "Adaptar el libro",
  "form.cancel": "Cancelar",

  "clarify.heading": "Se necesita una aclaración",
  "clarify.hint":
    "Gemini pausó este lote. Puede que ya haya empezado a transcribir. Responde la pregunta para continuar; el borrador y tu respuesta vuelven a Gemini. Los lotes pendientes restantes esperan hasta que este termine. También puedes reintentar desde cero sin responder.",
  "clarify.draftHeading": "Borrador hasta ahora",
  "clarify.answer": "Tu respuesta",
  "clarify.continue": "Continuar este lote",
  "clarify.retry": "Reintentar desde cero",
  "clarify.pages": "páginas {range}",
  "clarify.missingQuestion": "Gemini hizo una pregunta pero no incluyó el texto.",

  "blank.heading": "Salida en blanco — revisa las páginas originales",
  "blank.hint":
    "Gemini no devolvió texto para este lote. Puede que las páginas de origen estén en blanco, o que el modelo no haya visto el contenido impreso. Compara las páginas originales y luego omítelas si están en blanco o reintenta si tienen texto de la lección. Los lotes pendientes restantes esperan hasta que elijas.",
  "blank.skip": "Omitir por estar en blanco",
  "blank.retry": "Reintentar este lote",
  "blank.pages": "páginas {range}",
  "blank.sourcePage": "Página de origen {page}",
  "blank.downloadPage": "Descargar página de origen {page}",
  "blank.downloadSuffix": " si quieres el PDF original.",
  "blank.couldNotDraw": "No se pudo dibujar esta página. Usa el enlace de descarga para inspeccionarla.",
  "blank.loading": "Cargando las páginas originales…",
  "blank.scanAria": "Escaneo original de la página de origen {page}",
  "blank.pdfGone": "El PDF original ya no está disponible en esta sesión.",
  "blank.renderFailed":
    "No se pudieron mostrar las páginas originales. Omítelas si están en blanco, o reintenta si tienen contenido.",

  "progress.heading": "Progreso",
  "progress.batchesCompleted": "Lotes completados",
  "progress.batchStatus": "Estado de los lotes",

  "status.loadPdf": "Carga un PDF para planificar lotes. Gemini no se llama hasta que adaptes.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "Se planificó 1 lote a partir de {count} páginas. Gemini no se llama hasta que adaptes.",
  "status.plannedMany":
    "Se planificaron {batches} lotes a partir de {count} páginas. Gemini no se llama hasta que adaptes.",
  "status.splitting": "Dividiendo el PDF en lotes…",
  "status.noPending":
    "No hay lotes pendientes. Reintenta una fila fallida o descarga lo que ya se completó.",
  "status.batchProgress": "Lote {index} de {total}: páginas {range}",
  "status.batchRetry": "Lote {index} de {total}. {message}",
  "status.pausedClarify":
    "En pausa en las páginas {range}. Gemini necesita una aclaración antes de poder terminar ese lote.",
  "status.pausedBlank":
    "En pausa en las páginas {range}. Gemini no devolvió texto. Compara las páginas originales y luego omítelas si están en blanco o reintenta si tienen contenido.",
  "status.skippedBlankContinue":
    "Se omitieron las páginas {range} por estar en blanco. Continuando con los lotes restantes.",
  "status.skippedBlankFinished":
    "Se omitieron las páginas {range} por estar en blanco. Se terminaron {done} de {total} lotes.",
  "status.completedWithErrors":
    "{done} de {total} lotes completados. Reintenta las filas fallidas o descarga lo que terminó.",
  "status.finished":
    "Se terminaron {done} de {total} lotes. Puedes descargar el markdown accesible.",
  "status.stopped": "La adaptación se detuvo.",

  "errors.heading": "Lotes fallidos",
  "errors.hint":
    "Un lote fallido, una pregunta de aclaración o una salida en blanco detienen la ejecución. Los rangos pendientes restantes no se envían. Los límites de frecuencia esperan y reintentan el lote actual sin detenerse. Reintenta una fila fallida, responde una aclaración, omite o reintenta una salida en blanco, o Adaptar el libro para reanudar los lotes pendientes. Los lotes completados siguen pudiéndose descargar.",
  "errors.raw": "{raw}",
  "errors.pagesFailed": "páginas {range}: {error}",
  "errors.batchFailed": "Este lote falló.",
  "errors.retry": "Reintentar",

  "download.heading": "Descargar",
  "download.hint":
    "Las descargas incluyen solo los lotes completados, aunque algunas filas todavía necesiten un reintento.",
  "download.docx": "Descargar documento de Word",
  "download.md": "Descargar markdown combinado",
  "download.zip": "Descargar zip",

  "batch.noBatches": "Todavía no hay lotes planificados.",
  "batch.pages": "páginas {range}",
  "batch.pending": "pendiente",
  "batch.running": "en curso",
  "batch.done": "hecho",
  "batch.error": "error",
  "batch.retrying": "reintentando",
  "batch.clarify": "necesita aclaración",
  "batch.blank": "revisar páginas originales",
  "batch.skippedBlank": "omitido en blanco",
  "batch.issueOne": "1 problema",
  "batch.issues": "{count} problemas",
  "batch.emDash": "—",

  "issues.heading": "Problemas de estilo",
  "issues.hint":
    "Cuando termina un lote, aquí aparecen caracteres prohibidos como el ampersand, el asterisco, el numeral, los corchetes y las llaves. No detienen la ejecución. Pulsa un recuento en Progreso para ir a ese rango. Las palabras ilegibles aparecen como (poco claro) en el texto descargado, no en esta lista.",

  "file.onePage": "{fileName} · 1 página",
  "file.pages": "{fileName} · {count} páginas",

  "alert.choosePdfFirst": "Elige un PDF primero y luego planifica los lotes.",
  "alert.choosePdf": "Elige un archivo PDF.",
  "alert.notPdf": "Ese archivo no es un PDF. Elige un escaneo de libro de texto guardado como PDF.",
  "alert.noPages": "Este PDF no tiene páginas para adaptar.",
  "alert.couldNotRead": "No se pudo leer ese PDF. Prueba con otro archivo.",
  "alert.needKey":
    "Pega una clave de API de Gemini antes de adaptar. La clave se guarda solo en esta sesión del navegador.",
  "alert.needModel": "Elige un modelo, o selecciona Modelo personalizado e introduce un id de modelo.",
  "alert.needPdf": "Suelta o elige primero un PDF de libro de texto.",
  "alert.couldNotSplit": "No se pudo dividir ese PDF.",
  "alert.noClarify": "No hay ningún lote esperando una aclaración.",
  "alert.noBlankReview": "No hay ningún lote esperando una revisión de páginas en blanco.",
  "alert.typeAnswer": "Escribe una respuesta para que Gemini pueda terminar este lote.",
  "alert.raw": "{raw}",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recomendado)",
  "gemini.model25Flash": "Gemini 2.5 Flash",
  "gemini.model25Pro": "Gemini 2.5 Pro",
  "gemini.model20Flash": "Gemini 2.0 Flash",
  "gemini.rateLimitRetrying": "Límite de frecuencia. Esperando y luego reintentando este lote.",
  "gemini.rateLimitExhausted": "Este lote alcanzó el límite de frecuencia tras los reintentos.",
  "gemini.unavailableRetrying":
    "Gemini no está disponible temporalmente. Esperando y luego reintentando este lote.",
  "gemini.unavailableExhausted": "Gemini no estuvo disponible temporalmente tras los reintentos.",
  "gemini.cancelled": "Adaptación cancelada",
  "gemini.keyRejected": "Se rechazó la clave de API. Comprueba la clave e inténtalo de nuevo.",
  "gemini.blocked": "Gemini bloqueó este lote: {reason}",
  "gemini.requestFailed": "La solicitud a Gemini falló (HTTP {status}).",
  "gemini.unreachable":
    "No se pudo llegar a Gemini. Si esta página no puede llamar a Google, ejecuta python3 scripts/serve_adapter.py y usa esa dirección local, o configura una URL de proxy.",
  "gemini.empty": "Gemini devolvió texto vacío para este lote.",
  "gemini.failedAfterRetries": "La solicitud a Gemini falló tras los reintentos.",

  "runControl.remainingNotSent": "Los lotes restantes no se enviaron por este fallo.",
  "runControl.cancelled": "Cancelado. Los lotes completados siguen disponibles para descargar.",
  "runControl.pagesFailed": "páginas {range} fallaron: {error} {remaining}",
  "runControl.stopped":
    "Se detuvo después de que fallaran las páginas {range}. Reintenta ese rango, o Adaptar el libro para reanudar los lotes pendientes restantes.",
  "runControl.retryingRateLimit":
    "páginas {range}: Límite de frecuencia. Esperando {seconds}s y luego reintentando este lote.",
  "runControl.retryingUnavailable":
    "páginas {range}: Gemini no está disponible temporalmente. Esperando {seconds}s y luego reintentando este lote.",

  "pdf.libFailed": "No se pudo cargar pdf-lib. Comprueba docs/vendor/pdf-lib.min.js.",
  "pdf.jszipFailed": "No se pudo cargar JSZip. Comprueba docs/vendor/jszip.min.js.",
};
