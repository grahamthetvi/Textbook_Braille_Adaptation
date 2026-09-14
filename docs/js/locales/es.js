/** Spanish UI catalog. Keys must stay in sync with en.js and ar.js. */

export const es = {
  "header.title": "Adaptador de libros de texto",
  "header.eyebrow": "Preparación accesible de libros de texto",
  "header.lede":
    "Suelte un PDF de libro de texto escaneado, pegue una clave de API de Gemini y descargue markdown accesible para lectores de pantalla. La clave permanece en esta sesión del navegador y solo se envía a Google Gemini, o a un proxy opcional que usted configure.",
  "header.skipLink": "Saltar al contenido principal",
  "header.toolbarLabel": "Idioma y presentación",
  "header.language": "Idioma",
  "header.languageHint":
    "Gemini hace las preguntas de aclaración en este idioma y marca las palabras ilegibles en este idioma. El texto de la lección impresa se mantiene en el idioma del libro.",
  "header.themeDark": "Modo nocturno",
  "header.themeLight": "Modo diurno",

  "form.geminiAccess": "Acceso a Gemini",
  "form.apiKey": "Clave de API de Gemini",
  "form.apiKeyHintHtml":
    'Cree una clave de API de Gemini en <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Es necesaria para adaptar. No se escribe en el disco. El almacenamiento de sesión solo se usa si marca la casilla de abajo.',
  "form.setupSummary": "Cómo conectar Gemini 3.8 Flash",
  "form.setupStep1Html":
    'Abra <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">las claves de API de Google AI Studio</a> e inicie sesión con la cuenta de Google que se facturará.',
  "form.setupStep2Html":
    "Cree una clave de API en un proyecto de Google Cloud. Si se le pide, active la <strong>API de Gemini</strong> (Generative Language API) en ese proyecto.",
  "form.setupStep3Html":
    "Pegue la clave en el campo de arriba. Deje <strong>Modelo</strong> en Gemini 3.8 Flash. El id de la API de Google es <code>gemini-3.8-flash</code>.",
  "form.setupStep4Html":
    "No escriba nombres de Cursor como <code>gemini-3.8-flash-medium</code> en Modelo personalizado. No son ids válidos de la API de Google.",
  "form.setupStep5Html":
    "Si esta página no puede llegar a Google desde el navegador, ejecute <code>python3 scripts/serve_adapter.py</code> y configure el proxy en <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "Recordar la clave en esta sesión",
  "form.model": "Modelo",
  "form.modelHint": "Use Gemini 3.8 Flash salvo que una clave antigua no pueda llamar a ese modelo.",
  "form.customModel": "Modelo personalizado",
  "form.batchSize": "Tamaño de lote preferido",
  "form.latexMath": "Envolver matemáticas en LaTeX (para Nemeth)",
  "form.latexHint":
    "Desactivado por defecto: las matemáticas se leen como texto simple. Si lo marca, Gemini envuelve las matemáticas en LaTeX para convertirlas después a Nemeth.",
  "form.advancedSummary": "Avanzado: URL de proxy opcional",
  "form.proxyUrl": "URL del proxy",
  "form.proxyHint":
    "Déjelo en blanco para llamar a Google Gemini desde este navegador. Configure un proxy si esta página no puede llegar a Google, usando un host que reenvíe generateContent.",
  "form.pdfLegend": "PDF del libro de texto",
  "form.dropLead": "Suelte aquí un PDF de libro de texto",
  "form.dropOr": "o",
  "form.filePicker": "Archivo PDF",
  "form.noFile": "No hay ningún archivo cargado.",
  "form.planBatches": "Planificar lotes",
  "form.adaptBook": "Adaptar el libro",
  "form.cancel": "Cancelar",
  "form.fileMeta": "{fileName} · {pages}",
  "form.pageOne": "1 página",
  "form.pageMany": "{count} páginas",

  "status.idle": "Cargue un PDF para planificar lotes. Gemini no se llama hasta que adapte.",
  "status.plannedOne":
    "Se planificó 1 lote a partir de {pageCount} páginas. Gemini no se llama hasta que adapte.",
  "status.plannedMany":
    "Se planificaron {count} lotes a partir de {pageCount} páginas. Gemini no se llama hasta que adapte.",
  "status.splitting": "Dividiendo el PDF en lotes…",
  "status.batchProgress": "Lote {index} de {total}: páginas {pageRange}",
  "status.batchRetrying": "Lote {index} de {total}. {detail}",
  "status.pausedClarify":
    "En pausa en las páginas {pageRange}. Gemini necesita una aclaración antes de terminar ese lote.",
  "status.pausedBlank":
    "En pausa en las páginas {pageRange}. Gemini no devolvió texto. Compare las páginas originales; omita si están en blanco o reintente si tienen contenido.",
  "status.noPending":
    "No hay lotes pendientes. Reintente una fila fallida o descargue lo que ya se completó.",
  "status.finishedFailed":
    "{done} de {total} lotes completados. Reintente las filas fallidas o descargue lo que terminó.",
  "status.finishedOk":
    "Se terminaron {done} de {total} lotes. Ya puede descargar el markdown accesible.",
  "status.stopped": "Adaptación detenida.",
  "status.skippedContinue":
    "Se omitieron las páginas {pageRange} por estar en blanco. Continuando con los lotes restantes.",
  "status.skippedFinished":
    "Se omitieron las páginas {pageRange} por estar en blanco. Se terminaron {done} de {total} lotes.",

  "errors.choosePdfFirst": "Elija un PDF primero y luego planifique los lotes.",
  "errors.choosePdfFile": "Elija un archivo PDF.",
  "errors.notPdf": "Ese archivo no es un PDF. Elija un escaneo de libro de texto guardado como PDF.",
  "errors.noPages": "Este PDF no tiene páginas para adaptar.",
  "errors.readPdf": "No se pudo leer ese PDF. Pruebe con otro archivo.",
  "errors.needApiKey":
    "Pegue una clave de API de Gemini antes de adaptar. La clave solo se guarda en esta sesión del navegador.",
  "errors.needModel": "Elija un modelo, o seleccione Modelo personalizado e introduzca un id de modelo.",
  "errors.needPdf": "Suelte o elija primero un PDF de libro de texto.",
  "errors.splitPdf": "No se pudo dividir ese PDF.",
  "errors.noBlankReview": "No hay ningún lote en espera de revisión de páginas en blanco.",
  "errors.noClarify": "No hay ningún lote en espera de aclaración.",
  "errors.needClarifyAnswer": "Escriba una respuesta para que Gemini pueda terminar este lote.",
  "errors.batchFailed": "Este lote falló.",
  "errors.failedRow": "páginas {pageRange}: {error}",
  "errors.heading": "Lotes fallidos",
  "errors.hint":
    "Un lote fallido, una pregunta de aclaración o una salida en blanco detienen la ejecución. Los rangos pendientes restantes no se envían. Los límites de frecuencia esperan y reintentan el lote actual sin detenerse. Reintente una fila fallida, responda una aclaración, omita o reintente una salida en blanco, o pulse Adaptar el libro para reanudar los lotes pendientes. Los lotes completados siguen disponibles para descargar.",
  "errors.retry": "Reintentar",

  "blank.heading": "Salida en blanco — revise las páginas originales",
  "blank.hint":
    "Gemini no devolvió texto para este lote. Puede significar que las páginas de origen están en blanco, o que el modelo no leyó el contenido impreso. Compare las páginas originales; omita si están en blanco o reintente si tienen texto de la lección. Los lotes pendientes restantes esperan hasta que elija.",
  "blank.skip": "Omitir por estar en blanco",
  "blank.retry": "Reintentar este lote",
  "blank.sourcePage": "Página de origen {page}",
  "blank.downloadPage": "Descargar página de origen {page}",
  "blank.downloadSuffix": " si desea el PDF original.",
  "blank.ariaLabel": "Escaneo original de la página de origen {page}",
  "blank.drawFail": "No se pudo dibujar esta página. Use el enlace de descarga para inspeccionarla.",
  "blank.loading": "Cargando páginas originales…",
  "blank.noPdf": "El PDF original ya no está disponible en esta sesión.",
  "blank.renderFail":
    "No se pudieron mostrar las páginas originales. Omita si están en blanco, o reintente si tienen contenido.",
  "blank.emptyMessage": "Gemini devolvió texto vacío para este lote.",
  "blank.pages": "páginas {pageRange}",

  "clarify.heading": "Se necesita aclaración",
  "clarify.hint":
    "Gemini pausó este lote. Puede que ya haya empezado a transcribir. Responda la pregunta para continuar; el borrador y su respuesta vuelven a Gemini. Los lotes pendientes restantes esperan hasta que este termine. También puede reintentar desde cero sin responder.",
  "clarify.draftHeading": "Borrador hasta ahora",
  "clarify.answer": "Su respuesta",
  "clarify.continue": "Continuar este lote",
  "clarify.retry": "Reintentar desde cero",
  "clarify.missingQuestion": "Gemini hizo una pregunta pero no incluyó el texto.",
  "clarify.pages": "páginas {pageRange}",

  "issues.heading": "Problemas de estilo",
  "issues.hint":
    "Cuando termina un lote, aquí aparecen caracteres prohibidos como el ampersand, el asterisco, el numeral, los corchetes y las llaves. No detienen la ejecución. Pulse un recuento en Progreso para ir a ese rango. Las palabras ilegibles aparecen como (poco claro) en el texto descargado, no en esta lista.",

  "download.heading": "Descargar",
  "download.hint":
    "Las descargas incluyen solo los lotes completados, aunque algunas filas aún necesiten un reintento.",
  "download.docx": "Descargar documento de Word",
  "download.markdown": "Descargar markdown combinado",
  "download.zip": "Descargar zip",

  "progress.heading": "Progreso",
  "progress.label": "Lotes completados",
  "progress.batchListLabel": "Estado de los lotes",
  "progress.noBatches": "Aún no hay lotes planificados.",
  "progress.pages": "páginas {pageRange}",
  "progress.retrying": "reintentando",
  "progress.clarify": "necesita aclaración",
  "progress.blank": "revisar páginas originales",
  "progress.pending": "pendiente",
  "progress.running": "en curso",
  "progress.done": "hecho",
  "progress.error": "error",
  "progress.skippedBlank": "omitido en blanco",
  "progress.issueOne": "1 problema",
  "progress.issueMany": "{count} problemas",
  "progress.dash": "—",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recomendado)",
  "gemini.modelFlash25": "Gemini 2.5 Flash",
  "gemini.modelPro25": "Gemini 2.5 Pro",
  "gemini.modelFlash20": "Gemini 2.0 Flash",
  "gemini.rateLimitRetrying": "Límite de frecuencia. Esperando y luego reintentando este lote.",
  "gemini.rateLimitExhausted": "Este lote alcanzó el límite de frecuencia después de los reintentos.",
  "gemini.unavailableRetrying":
    "Gemini no está disponible temporalmente. Esperando y luego reintentando este lote.",
  "gemini.unavailableExhausted": "Gemini no estuvo disponible temporalmente después de los reintentos.",
  "gemini.apiKeyRejected": "La clave de API fue rechazada. Compruebe la clave e inténtelo de nuevo.",
  "gemini.blocked": "Gemini bloqueó este lote: {reason}",
  "gemini.requestFailed": "La solicitud a Gemini falló (HTTP {status}).",
  "gemini.unreachable":
    "No se pudo contactar con Gemini. Si esta página no puede llamar a Google, ejecute python3 scripts/serve_adapter.py y use esa dirección local, o configure una URL de proxy.",
  "gemini.failedRetries": "La solicitud a Gemini falló después de los reintentos.",
  "gemini.cancelled": "Adaptación cancelada",

  "runControl.remainingNotSent": "Los lotes restantes no se enviaron a causa de este fallo.",
  "runControl.cancelled": "Cancelado. Los lotes completados siguen disponibles para descargar.",
  "runControl.failedAlert": "páginas {pageRange} fallaron: {error} {remaining}",
  "runControl.stoppedStatus":
    "Detenido después de que fallaran las páginas {pageRange}. Reintente ese rango, o pulse Adaptar el libro para reanudar los lotes pendientes restantes.",
  "runControl.retryingRateLimit":
    "páginas {pageRange}: Límite de frecuencia. Esperando {seconds}s y luego reintentando este lote.",
  "runControl.retryingUnavailable":
    "páginas {pageRange}: Gemini no está disponible temporalmente. Esperando {seconds}s y luego reintentando este lote.",
};
