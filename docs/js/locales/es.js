/** Spanish UI catalog for the textbook adapter. */

export const es = {
  "header.title": "Adaptador de libros de texto",
  "header.skip": "Saltar al contenido principal",
  "header.eyebrow": "Preparación accesible de libros de texto",
  "header.lede":
    "Suelta un PDF de libro de texto escaneado, elige un modelo y descarga markdown accesible para lectores de pantalla. Las claves en la nube permanecen en esta sesión del navegador. Gemini puede ejecutarse desde esta página; Claude, OpenAI y Ollama necesitan el servidor adaptador local.",

  "toolbar.displayOptions": "Opciones de visualización",
  "toolbar.language": "Idioma",
  "toolbar.darkMode": "Modo oscuro",
  "header.languageHint":
    "Las preguntas de aclaración y las marcas de palabras ilegibles usan este idioma. El texto de la lección impresa se mantiene en el idioma del libro.",

  "form.modelAccess": "Acceso al modelo",
  "form.rememberKey": "Recordar la clave en esta sesión",
  "form.model": "Modelo",
  "form.effort": "Esfuerzo",
  "form.customModel": "Modelo personalizado",
  "form.batchSize": "Tamaño de lote preferido",
  "form.latexMath": "Envolver las matemáticas en LaTeX (para Nemeth)",
  "form.latexHint":
    "Desactivado por defecto: las matemáticas se leen como texto sencillo. Si lo marcas, el modelo envuelve las matemáticas en LaTeX para poder convertirlas después a Nemeth.",
  "form.advanced": "Avanzado: URL de proxy opcional de Gemini",
  "form.proxyUrl": "URL del proxy",
  "form.proxyHint":
    "Solo Gemini. Déjalo en blanco para llamar a Google desde este navegador. Configura un proxy si esta página no puede llegar a Google, usando un host que reenvíe generateContent. Claude, OpenAI y Ollama siempre usan las rutas del adaptador local.",

  "form.gemini.apiKey": "Clave de API de Gemini",
  "form.gemini.apiKeyHint":
    'Crea una clave de API de Gemini en <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Hace falta para adaptar. No se guarda en el disco. El almacenamiento de sesión se usa solo si marcas la casilla de abajo.',
  "form.gemini.setupSummary": "Cómo conectar Gemini 3.8 Flash",
  "form.gemini.setupStep1":
    'Abre <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">las claves de API de Google AI Studio</a> e inicia sesión con la cuenta de Google que se facturará.',
  "form.gemini.setupStep2":
    "Crea una clave de API en un proyecto de Google Cloud. Si se te pide, habilita la <strong>API de Gemini</strong> (Generative Language API) para ese proyecto.",
  "form.gemini.setupStep3":
    "Pega la clave en el campo de arriba. Deja <strong>Modelo</strong> en Gemini 3.8 Flash. El id de la API de Google es <code>gemini-3.8-flash</code>. Deja <strong>Esfuerzo</strong> en medio (recomendado).",
  "form.gemini.setupStep4":
    "No escribas nombres de Cursor como <code>gemini-3.8-flash-medium</code> en Modelo personalizado. Esos no son ids válidos de la API de Google; elige el modelo y el esfuerzo por separado.",
  "form.gemini.setupStep5":
    "Si esta página no puede llegar a Google desde el navegador, ejecuta <code>python3 scripts/serve_adapter.py</code> y configura el proxy en <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.gemini.modelHint":
    "Usa Gemini 3.8 Flash salvo que necesites otro proveedor. Los nombres de Cursor no son ids de API.",
  "form.gemini.effortHint": "Nivel de pensamiento de Gemini. El medio es el recomendado para este trabajo de OCR.",

  "form.anthropic.apiKey": "Clave de API de Anthropic",
  "form.anthropic.apiKeyHint":
    'Crea una clave de API de Anthropic en <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">Anthropic Console</a>. Hace falta para adaptar. No se guarda en el disco. El almacenamiento de sesión se usa solo si marcas la casilla de abajo.',
  "form.anthropic.setupSummary": "Cómo conectar Claude",
  "form.anthropic.setupStep1":
    'Abre <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">las claves de API de Anthropic</a> e inicia sesión con la cuenta que se facturará.',
  "form.anthropic.setupStep2":
    "Crea una clave de API. El adaptador web la envía solo al servidor local, que la reenvía a <code>api.anthropic.com</code>.",
  "form.anthropic.setupStep3":
    "Pega la clave arriba. Modelo Claude recomendado: Sonnet 5 (<code>claude-sonnet-5</code>). Deja <strong>Esfuerzo</strong> en medio (recomendado). El valor por defecto de la API es alto; el medio es más barato para este OCR.",
  "form.anthropic.setupStep4":
    "No escribas nombres de Cursor como <code>Sonnet 5 - high</code>. El modelo y el esfuerzo son campos separados. Los ids reales de la API son <code>claude-sonnet-5</code> y <code>claude-opus-5</code>.",
  "form.anthropic.setupStep5":
    "Claude necesita el adaptador local. Ejecuta <code>python3 scripts/serve_adapter.py</code> y abre esa dirección. GitHub Pages no puede llamar a Anthropic desde el navegador.",
  "form.anthropic.modelHint": "Claude necesita el servidor adaptador local. Se recomienda esfuerzo medio.",
  "form.anthropic.effortHint":
    "Esfuerzo de salida de Claude. El medio es el recomendado; el valor por defecto de la API es alto.",

  "form.openai.apiKey": "Clave de API de OpenAI",
  "form.openai.apiKeyHint":
    'Crea una clave de API de OpenAI en <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">la plataforma de OpenAI</a>. Hace falta para adaptar. No se guarda en el disco. El almacenamiento de sesión se usa solo si marcas la casilla de abajo.',
  "form.openai.setupSummary": "Cómo conectar GPT-5.6",
  "form.openai.setupStep1":
    'Abre <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">las claves de API de OpenAI</a> e inicia sesión con la cuenta que se facturará.',
  "form.openai.setupStep2":
    "Crea una clave de API. El adaptador web la envía solo al servidor local, que la reenvía a <code>api.openai.com</code>.",
  "form.openai.setupStep3":
    "Pega la clave arriba. Modelo OpenAI recomendado: GPT-5.6 Luna (<code>gpt-5.6-luna</code>). Deja <strong>Esfuerzo</strong> en bajo (recomendado). El valor por defecto de la API es medio.",
  "form.openai.setupStep4":
    "No escribas nombres de Cursor como <code>gpt-5.6-luna-high</code>. El modelo y el esfuerzo son campos separados. Los ids reales de la API son <code>gpt-5.6-luna</code>, <code>gpt-5.6-terra</code> y <code>gpt-5.6-sol</code>. No envíes un modo de razonamiento Pro.",
  "form.openai.setupStep5":
    "OpenAI necesita el adaptador local. Ejecuta <code>python3 scripts/serve_adapter.py</code> y abre esa dirección. GitHub Pages no puede llamar a OpenAI desde el navegador.",
  "form.openai.modelHint": "GPT-5.6 necesita el servidor adaptador local. Se recomienda esfuerzo bajo.",
  "form.openai.effortHint":
    "Esfuerzo de razonamiento de GPT-5.6. El bajo es el recomendado; el valor por defecto de la API es medio.",

  "form.ollama.apiKey": "Ollama no usa una clave de API",
  "form.ollama.apiKeyHint": "Ollama se ejecuta en este equipo. No se envía ninguna clave de API en la nube.",
  "form.ollama.setupSummary": "Cómo conectar Ollama local",
  "form.ollama.setupStep1":
    "Instala Ollama desde <a href=\"https://ollama.com\" rel=\"noopener noreferrer\">ollama.com</a> e inícialo para que escuche en el puerto 11434.",
  "form.ollama.setupStep2":
    "Descarga un modelo de <strong>visión</strong>. Recomendado para texto de página: <code>ollama pull qwen2.5vl</code>. El ejemplo de visión actual de Ollama es <code>gemma4</code>. Un modelo solo de texto ignorará las imágenes de las páginas.",
  "form.ollama.setupStep3":
    "Ejecuta <code>python3 scripts/serve_adapter.py</code> y abre esa dirección local. GitHub Pages no puede llegar a Ollama en tu PC.",
  "form.ollama.setupStep4":
    "Elige <strong>Ollama (visión local)</strong>, confirma que la URL es loopback (<code>http://127.0.0.1:11434</code>) y luego Actualiza la lista de modelos. Deja <strong>Esfuerzo</strong> en apagado. El OCR de visión local no se beneficia de pensamiento extra.",
  "form.ollama.setupStep5":
    "La calidad suele quedar por detrás de Gemini 3.8 Flash en escaneos a dos columnas, letra pequeña y matemáticas. Revisa el primer lote. Necesitas RAM o VRAM suficientes para el modelo de visión.",
  "form.ollama.modelHint": "Solo modelos de visión locales. Actualiza la lista después de descargar una etiqueta.",
  "form.ollama.effortHint":
    "El OCR de visión local no se beneficia de pensamiento extra. Apagado es lo recomendado.",
  "form.ollama.url": "URL de Ollama",
  "form.ollama.urlHint":
    "Solo loopback. El adaptador local reenvía a esta dirección. GitHub Pages no puede llegar a Ollama en tu PC.",
  "form.ollama.modelList": "Modelo de visión de Ollama",
  "form.ollama.refresh": "Actualizar",
  "form.ollama.customTag": "Etiqueta personalizada de Ollama",
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
    "Gemini no devolvió texto para este lote. Puede que las páginas de origen estén en blanco, o que el modelo no haya visto el contenido impreso. Compara las páginas originales y luego omítelas si están en blanco o reintenta si tienen texto de la lección. Reintentar le dice a Gemini que un revisor confirmó texto impreso, así que debe transcribir estas páginas en lugar de devolver un resultado vacío. Los lotes pendientes restantes esperan hasta que elijas.",
  "blank.skip": "Omitir por estar en blanco",
  "blank.retry": "Reintentar: las páginas tienen texto",
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

  "status.loadPdf": "Carga un PDF para planificar lotes. El modelo no se llama hasta que adaptes.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "Se planificó 1 lote a partir de {count} páginas. El modelo no se llama hasta que adaptes.",
  "status.plannedMany":
    "Se planificaron {batches} lotes a partir de {count} páginas. El modelo no se llama hasta que adaptes.",
  "status.splitting": "Dividiendo el PDF en lotes…",
  "status.noPending":
    "No hay lotes pendientes. Reintenta una fila fallida o descarga lo que ya se completó.",
  "status.batchProgress": "Lote {index} de {total}: páginas {range}",
  "status.batchProgressEmptyRetry":
    "Lote {index} de {total}: páginas {range}. Reintentando después de que un revisor confirmó texto impreso.",
  "status.batchRetry": "Lote {index} de {total}. {message}",
  "status.pausedClarify":
    "En pausa en las páginas {range}. Gemini necesita una aclaración antes de poder terminar ese lote.",
  "status.pausedBlank":
    "En pausa en las páginas {range}. Gemini no devolvió texto. Compara las páginas originales y luego omítelas si están en blanco o reintenta si tienen contenido. Reintentar le dice a Gemini que estas páginas tienen texto impreso.",
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

  "file.onePage": "{fileName} · 1 página",
  "file.pages": "{fileName} · {count} páginas",

  "alert.choosePdfFirst": "Elige un PDF primero y luego planifica los lotes.",
  "alert.choosePdf": "Elige un archivo PDF.",
  "alert.notPdf": "Ese archivo no es un PDF. Elige un escaneo de libro de texto guardado como PDF.",
  "alert.noPages": "Este PDF no tiene páginas para adaptar.",
  "alert.couldNotRead": "No se pudo leer ese PDF. Prueba con otro archivo.",
  "alert.needKey":
    "Pega una clave de API de este proveedor antes de adaptar. La clave se guarda solo en esta sesión del navegador.",
  "alert.needModel": "Elige un modelo, o selecciona Modelo personalizado e introduce un id de modelo.",
  "alert.needOllamaModel": "Elige o introduce una etiqueta de modelo de visión de Ollama, como qwen2.5vl.",
  "alert.needLocalServer":
    "Claude, OpenAI y Ollama necesitan el adaptador local. Ejecuta python3 scripts/serve_adapter.py y abre esa dirección.",
  "alert.needPdf": "Suelta o elige primero un PDF de libro de texto.",
  "alert.couldNotSplit": "No se pudo dividir ese PDF.",
  "alert.noClarify": "No hay ningún lote esperando una aclaración.",
  "alert.noBlankReview": "No hay ningún lote esperando una revisión de páginas en blanco.",
  "alert.typeAnswer": "Escribe una respuesta para que Gemini pueda terminar este lote.",
  "alert.raw": "{raw}",

  "models.groupGemini": "Gemini",
  "models.groupClaude": "Claude",
  "models.groupOpenAI": "OpenAI",
  "models.groupOllama": "Ollama",
  "effort.none": "Ninguno",
  "effort.low": "Bajo",
  "effort.medium": "Medio",
  "effort.high": "Alto",
  "effort.xhigh": "Extra alto",
  "effort.max": "Máximo",
  "effort.off": "Apagado",
  "effort.on": "Encendido",
  "effort.recommended": "{label} (recomendado)",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recomendado)",
  "gemini.model31Pro": "Gemini 3.1 Pro",
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

  "claude.modelSonnet5": "Claude Sonnet 5 (recomendado)",
  "claude.modelOpus5": "Claude Opus 5",
  "anthropic.keyRejected": "Se rechazó la clave de API de Anthropic. Comprueba la clave e inténtalo de nuevo.",
  "anthropic.requestFailed": "La solicitud a Claude falló (HTTP {status}).",
  "anthropic.unavailableRetrying":
    "Claude no está disponible temporalmente. Esperando y luego reintentando este lote.",
  "anthropic.unavailableExhausted": "Claude no estuvo disponible temporalmente tras los reintentos.",
  "anthropic.failedAfterRetries": "La solicitud a Claude falló tras los reintentos.",

  "openai.modelLuna": "GPT-5.6 Luna (recomendado)",
  "openai.modelTerra": "GPT-5.6 Terra",
  "openai.modelSol": "GPT-5.6 Sol",
  "openai.keyRejected": "Se rechazó la clave de API de OpenAI. Comprueba la clave e inténtalo de nuevo.",
  "openai.requestFailed": "La solicitud a OpenAI falló (HTTP {status}).",
  "openai.unavailableRetrying":
    "OpenAI no está disponible temporalmente. Esperando y luego reintentando este lote.",
  "openai.unavailableExhausted": "OpenAI no estuvo disponible temporalmente tras los reintentos.",
  "openai.failedAfterRetries": "La solicitud a OpenAI falló tras los reintentos.",

  "ollama.localVision": "Ollama (visión local)",
  "ollama.notLocal":
    "Ollama solo funciona a través del adaptador local en este equipo. GitHub Pages no puede llegar a Ollama en tu PC. Ejecuta python3 scripts/serve_adapter.py.",
  "ollama.loopbackOnly":
    "El adaptador solo reenvía a una URL de Ollama en loopback, como http://127.0.0.1:11434.",
  "ollama.requestFailed": "La solicitud a Ollama falló (HTTP {status}).",
  "ollama.unavailableRetrying":
    "Ollama no está disponible temporalmente. Esperando y luego reintentando este lote.",
  "ollama.unavailableExhausted": "Ollama no estuvo disponible temporalmente tras los reintentos.",
  "ollama.failedAfterRetries": "La solicitud a Ollama falló tras los reintentos.",
  "ollama.noPages": "No se pudieron rasterizar las páginas del PDF para Ollama.",
  "ollama.refreshFailed":
    "No se pudieron listar los modelos de Ollama. Confirma que el adaptador local está en marcha y que hay un modelo de visión descargado.",

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
