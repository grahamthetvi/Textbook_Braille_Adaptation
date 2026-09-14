/** Arabic UI catalog for the textbook adapter. */

export const ar = {
  "header.title": "محوّل الكتب الدراسية",
  "header.skip": "تخطي إلى المحتوى الرئيسي",
  "header.eyebrow": "إعداد كتب دراسية ميسّرة",
  "header.lede":
    "أسقط ملف PDF ممسوحًا لكتاب دراسي، واختر نموذجًا، ثم نزّل ماركداون ميسّرًا لقارئات الشاشة. تبقى مفاتيح السحابة في جلسة هذا المتصفح. يمكن تشغيل Gemini من هذه الصفحة؛ يحتاج Claude وOpenAI وOllama إلى خادم المحوّل المحلي.",

  "toolbar.displayOptions": "خيارات العرض",
  "toolbar.language": "اللغة",
  "toolbar.darkMode": "الوضع الداكن",
  "header.languageHint":
    "تستخدم أسئلة التوضيح وعلامات الكلمات غير المقروءة هذه اللغة. يبقى نص الدرس المطبوع بلغة الكتاب.",

  "form.modelAccess": "الوصول إلى النموذج",
  "form.rememberKey": "تذكّر المفتاح في هذه الجلسة",
  "form.model": "النموذج",
  "form.effort": "الجهد",
  "form.customModel": "نموذج مخصص",
  "form.batchSize": "حجم الدفعة المفضل",
  "form.latexMath": "تغليف الرياضيات بـ LaTeX (لنيمث)",
  "form.latexHint":
    "متوقف افتراضيًا: تُنطق الرياضيات كنص عادي. عند التحديد، يغلّف النموذج الرياضيات بـ LaTeX ليُحوَّل لاحقًا إلى نيمث.",
  "form.advanced": "متقدم: عنوان وكيل Gemini اختياري",
  "form.proxyUrl": "عنوان الوكيل",
  "form.proxyHint":
    "لـ Gemini فقط. اتركه فارغًا لاستدعاء Google من هذا المتصفح. عيّن وكيلًا إذا تعذّر على هذه الصفحة الوصول إلى Google، باستخدام مضيف يعيد توجيه generateContent. يستخدم Claude وOpenAI وOllama دائمًا مسارات المحوّل المحلي.",

  "form.gemini.apiKey": "مفتاح واجهة Gemini",
  "form.gemini.apiKeyHint":
    'أنشئ مفتاح واجهة Gemini في <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. مطلوب للتكييف. لا يُكتب على القرص. يُستخدم تخزين الجلسة فقط إذا حددت المربع أدناه.',
  "form.gemini.setupSummary": "كيفية توصيل Gemini 3.8 Flash",
  "form.gemini.setupStep1":
    'افتح <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">مفاتيح واجهة Google AI Studio</a> وسجّل الدخول بحساب Google الذي ستُفوَّت عليه التكلفة.',
  "form.gemini.setupStep2":
    "أنشئ مفتاح واجهة في مشروع Google Cloud. إذا طُلب منك ذلك، فعّل <strong>واجهة Gemini</strong> (Generative Language API) لذلك المشروع.",
  "form.gemini.setupStep3":
    "الصق المفتاح في الحقل أعلاه. اترك <strong>النموذج</strong> على Gemini 3.8 Flash. معرّف واجهة Google هو <code>gemini-3.8-flash</code>. اترك <strong>الجهد</strong> على متوسط (موصى به).",
  "form.gemini.setupStep4":
    "لا تكتب أسماء Cursor مثل <code>gemini-3.8-flash-medium</code> في النموذج المخصص. تلك ليست معرّفات صالحة لواجهة Google؛ اختر النموذج والجهد بشكل منفصل.",
  "form.gemini.setupStep5":
    "إذا تعذّر على هذه الصفحة الوصول إلى Google من المتصفح، شغّل <code>python3 scripts/serve_adapter.py</code> واضبط الوكيل على <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.gemini.modelHint":
    "استخدم Gemini 3.8 Flash ما لم تكن بحاجة إلى مزوّد آخر. أسماء Cursor ليست معرّفات واجهة.",
  "form.gemini.effortHint": "مستوى تفكير Gemini. المتوسط موصى به لمهمة التعرف هذه.",

  "form.anthropic.apiKey": "مفتاح واجهة Anthropic",
  "form.anthropic.apiKeyHint":
    'أنشئ مفتاح واجهة Anthropic في <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">Anthropic Console</a>. مطلوب للتكييف. لا يُكتب على القرص. يُستخدم تخزين الجلسة فقط إذا حددت المربع أدناه.',
  "form.anthropic.setupSummary": "كيفية توصيل Claude",
  "form.anthropic.setupStep1":
    'افتح <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">مفاتيح واجهة Anthropic</a> وسجّل الدخول بالحساب الذي ستُفوَّت عليه التكلفة.',
  "form.anthropic.setupStep2":
    "أنشئ مفتاح واجهة. يرسله المحوّل على الويب فقط إلى الخادم المحلي، الذي يعيد توجيهه إلى <code>api.anthropic.com</code>.",
  "form.anthropic.setupStep3":
    "الصق المفتاح أعلاه. نموذج Claude الموصى به: Sonnet 5 (<code>claude-sonnet-5</code>). اترك <strong>الجهد</strong> على متوسط (موصى به). الافتراضي في الواجهة هو مرتفع؛ المتوسط أرخص لمهمة التعرف هذه.",
  "form.anthropic.setupStep4":
    "لا تكتب أسماء Cursor مثل <code>Sonnet 5 - high</code>. النموذج والجهد حقلان منفصلان. معرّفات الواجهة الحقيقية هي <code>claude-sonnet-5</code> و<code>claude-opus-5</code>.",
  "form.anthropic.setupStep5":
    "يحتاج Claude إلى المحوّل المحلي. شغّل <code>python3 scripts/serve_adapter.py</code> وافتح ذلك العنوان. لا تستطيع GitHub Pages استدعاء Anthropic من المتصفح.",
  "form.anthropic.modelHint": "يحتاج Claude إلى خادم المحوّل المحلي. يُوصى بجهد متوسط.",
  "form.anthropic.effortHint":
    "جهد إخراج Claude. المتوسط موصى به؛ الافتراضي في الواجهة مرتفع.",

  "form.openai.apiKey": "مفتاح واجهة OpenAI",
  "form.openai.apiKeyHint":
    'أنشئ مفتاح واجهة OpenAI في <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">منصة OpenAI</a>. مطلوب للتكييف. لا يُكتب على القرص. يُستخدم تخزين الجلسة فقط إذا حددت المربع أدناه.',
  "form.openai.setupSummary": "كيفية توصيل GPT-5.6",
  "form.openai.setupStep1":
    'افتح <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">مفاتيح واجهة OpenAI</a> وسجّل الدخول بالحساب الذي ستُفوَّت عليه التكلفة.',
  "form.openai.setupStep2":
    "أنشئ مفتاح واجهة. يرسله المحوّل على الويب فقط إلى الخادم المحلي، الذي يعيد توجيهه إلى <code>api.openai.com</code>.",
  "form.openai.setupStep3":
    "الصق المفتاح أعلاه. نموذج OpenAI الموصى به: GPT-5.6 Luna (<code>gpt-5.6-luna</code>). اترك <strong>الجهد</strong> على منخفض (موصى به). الافتراضي في الواجهة هو متوسط.",
  "form.openai.setupStep4":
    "لا تكتب أسماء Cursor مثل <code>gpt-5.6-luna-high</code>. النموذج والجهد حقلان منفصلان. معرّفات الواجهة الحقيقية هي <code>gpt-5.6-luna</code> و<code>gpt-5.6-terra</code> و<code>gpt-5.6-sol</code>. لا ترسل وضع استدلال Pro.",
  "form.openai.setupStep5":
    "يحتاج OpenAI إلى المحوّل المحلي. شغّل <code>python3 scripts/serve_adapter.py</code> وافتح ذلك العنوان. لا تستطيع GitHub Pages استدعاء OpenAI من المتصفح.",
  "form.openai.modelHint": "يحتاج GPT-5.6 إلى خادم المحوّل المحلي. يُوصى بجهد منخفض.",
  "form.openai.effortHint":
    "جهد استدلال GPT-5.6. المنخفض موصى به؛ الافتراضي في الواجهة متوسط.",

  "form.ollama.apiKey": "Ollama لا يستخدم مفتاح واجهة",
  "form.ollama.apiKeyHint": "يعمل Ollama على هذا الحاسوب. لا يُرسل أي مفتاح سحابي.",
  "form.ollama.setupSummary": "كيفية توصيل Ollama المحلي",
  "form.ollama.setupStep1":
    "ثبّت Ollama من <a href=\"https://ollama.com\" rel=\"noopener noreferrer\">ollama.com</a> وشغّله ليستمع على المنفذ 11434.",
  "form.ollama.setupStep2":
    "نزّل نموذج <strong>رؤية</strong>. الموصى به لنص الصفحة: <code>ollama pull qwen2.5vl</code>. مثال الرؤية الحالي لدى Ollama هو <code>gemma4</code>. النموذج النصي فقط سيتجاهل صور الصفحات.",
  "form.ollama.setupStep3":
    "شغّل <code>python3 scripts/serve_adapter.py</code> وافتح ذلك العنوان المحلي. لا تستطيع GitHub Pages الوصول إلى Ollama على جهازك.",
  "form.ollama.setupStep4":
    "اختر <strong>Ollama (رؤية محلية)</strong>، وتأكد أن العنوان هو loopback (<code>http://127.0.0.1:11434</code>)، ثم حدّث قائمة النماذج. اترك <strong>الجهد</strong> متوقفًا. التعرف البصري المحلي لا يستفيد من تفكير إضافي.",
  "form.ollama.setupStep5":
    "الجودة عادةً أقل من Gemini 3.8 Flash في المسوحات ذات العمودين والطباعة الصغيرة والرياضيات. راجع الدفعة الأولى. تحتاج ذاكرة RAM أو VRAM كافية لنموذج الرؤية.",
  "form.ollama.modelHint": "نماذج الرؤية المحلية فقط. حدّث القائمة بعد تنزيل وسم.",
  "form.ollama.effortHint":
    "التعرف البصري المحلي لا يستفيد من تفكير إضافي. الإيقاف موصى به.",
  "form.ollama.url": "عنوان Ollama",
  "form.ollama.urlHint":
    "loopback فقط. يعيد المحوّل المحلي التوجيه إلى هذا العنوان. لا تستطيع GitHub Pages الوصول إلى Ollama على جهازك.",
  "form.ollama.modelList": "نموذج رؤية Ollama",
  "form.ollama.refresh": "تحديث",
  "form.ollama.customTag": "وسم Ollama مخصص",
  "form.pdfLegend": "ملف PDF للكتاب الدراسي",
  "form.dropLead": "أسقط ملف PDF لكتاب دراسي هنا",
  "form.dropOr": "أو",
  "form.pdfFile": "ملف PDF",
  "form.noFile": "لم يُحمَّل أي ملف.",
  "form.planBatches": "تخطيط الدفعات",
  "form.adaptBook": "تكييف الكتاب",
  "form.cancel": "إلغاء",

  "clarify.heading": "يلزم توضيح",
  "clarify.hint":
    "أوقف Gemini هذه الدفعة. ربما يكون قد بدأ النسخ بالفعل. أجب عن السؤال للمتابعة؛ تُرسل المسودة وإجابتك إلى Gemini. تنتظر الدفعات المعلقة المتبقية حتى تنتهي هذه. يمكنك أيضًا إعادة المحاولة من البداية دون الإجابة.",
  "clarify.draftHeading": "المسودة حتى الآن",
  "clarify.answer": "إجابتك",
  "clarify.continue": "متابعة هذه الدفعة",
  "clarify.retry": "إعادة المحاولة من البداية",
  "clarify.pages": "الصفحات {range}",
  "clarify.missingQuestion": "طرح Gemini سؤالًا لكنه لم يضمّن النص.",

  "blank.heading": "مخرجات فارغة — تحقق من الصفحات الأصلية",
  "blank.hint":
    "لم يُرجع Gemini نصًا لهذه الدفعة. قد يعني ذلك أن صفحات المصدر فارغة، أو أن النموذج فاته المحتوى المطبوع. قارن الصفحات الأصلية، ثم تخطَّها إذا كانت فارغة أو أعد المحاولة إذا كان فيها نص الدرس. إعادة المحاولة تُخبر Gemini أن مراجعًا أكد وجود نص مطبوع، لذلك يجب أن ينسخ هذه الصفحات بدلًا من إرجاع مخرجات فارغة. تنتظر الدفعات المعلقة المتبقية حتى تختار.",
  "blank.skip": "تخطي لأنها فارغة",
  "blank.retry": "إعادة المحاولة — الصفحات فيها نص",
  "blank.pages": "الصفحات {range}",
  "blank.sourcePage": "صفحة المصدر {page}",
  "blank.downloadPage": "تنزيل صفحة المصدر {page}",
  "blank.downloadSuffix": " إذا أردت ملف PDF الأصلي.",
  "blank.couldNotDraw": "تعذّر رسم هذه الصفحة. استخدم رابط التنزيل لفحصها.",
  "blank.loading": "جارٍ تحميل الصفحات الأصلية…",
  "blank.scanAria": "المسح الأصلي لصفحة المصدر {page}",
  "blank.pdfGone": "ملف PDF الأصلي لم يعد متاحًا في هذه الجلسة.",
  "blank.renderFailed":
    "تعذّر عرض الصفحات الأصلية. تخطَّها إذا كانت فارغة، أو أعد المحاولة إذا كان فيها محتوى.",

  "progress.heading": "التقدم",
  "progress.batchesCompleted": "الدفعات المكتملة",
  "progress.batchStatus": "حالة الدفعات",

  "status.loadPdf": "حمّل ملف PDF لتخطيط الدفعات. لا يُستدعى النموذج حتى تبدأ التكييف.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "تم تخطيط دفعة واحدة من {count} صفحات. لا يُستدعى النموذج حتى تبدأ التكييف.",
  "status.plannedMany":
    "تم تخطيط {batches} دفعات من {count} صفحات. لا يُستدعى النموذج حتى تبدأ التكييف.",
  "status.splitting": "جارٍ تقسيم ملف PDF إلى دفعات…",
  "status.noPending": "لا توجد دفعات معلّقة. أعد محاولة صف فاشل، أو نزّل ما اكتمل بالفعل.",
  "status.batchProgress": "الدفعة {index} من {total}: الصفحات {range}",
  "status.batchProgressEmptyRetry":
    "الدفعة {index} من {total}: الصفحات {range}. إعادة المحاولة بعد أن أكد مراجع وجود نص مطبوع.",
  "status.batchRetry": "الدفعة {index} من {total}. {message}",
  "status.pausedClarify":
    "متوقف عند الصفحات {range}. يحتاج Gemini إلى توضيح قبل أن تكتمل تلك الدفعة.",
  "status.pausedBlank":
    "متوقف عند الصفحات {range}. لم يُرجع Gemini نصًا. قارن الصفحات الأصلية، ثم تخطَّها إذا كانت فارغة أو أعد المحاولة إذا كان فيها محتوى. إعادة المحاولة تُخبر Gemini أن هذه الصفحات فيها نص مطبوع.",
  "status.skippedBlankContinue":
    "تم تخطي الصفحات {range} لأنها فارغة. المتابعة مع الدفعات المتبقية.",
  "status.skippedBlankFinished":
    "تم تخطي الصفحات {range} لأنها فارغة. انتهت {done} من {total} دفعات.",
  "status.completedWithErrors":
    "اكتملت {done} من {total} دفعات. أعد محاولة الصفوف الفاشلة أو نزّل ما انتهى.",
  "status.finished":
    "انتهت {done} من {total} دفعات. يمكنك تنزيل الماركداون الميسّر.",
  "status.stopped": "توقف التكييف.",

  "errors.heading": "دفعات فاشلة",
  "errors.hint":
    "دفعة فاشلة أو سؤال توضيحي أو مخرجات فارغة توقف التشغيل. لا تُرسل النطاقات المعلقة المتبقية. حدود المعدل تنتظر وتعيد محاولة الدفعة الحالية دون توقف. أعد محاولة صف فاشل، أو أجب عن توضيح، أو تخطَّ المخرجات الفارغة أو أعد محاولتها، أو تكييف الكتاب لاستئناف الدفعات المعلقة. تبقى الدفعات المكتملة قابلة للتنزيل.",
  "errors.raw": "{raw}",
  "errors.pagesFailed": "الصفحات {range}: {error}",
  "errors.batchFailed": "فشلت هذه الدفعة.",
  "errors.retry": "إعادة المحاولة",

  "download.heading": "تنزيل",
  "download.hint": "تشمل التنزيلات الدفعات المكتملة فقط، حتى إذا كانت بعض الصفوف لا تزال بحاجة إلى إعادة محاولة.",
  "download.docx": "تنزيل مستند Word",
  "download.md": "تنزيل الماركداون المدمج",
  "download.zip": "تنزيل zip",

  "batch.noBatches": "لم تُخطَّط أي دفعات بعد.",
  "batch.pages": "الصفحات {range}",
  "batch.pending": "معلّق",
  "batch.running": "جارٍ",
  "batch.done": "تم",
  "batch.error": "خطأ",
  "batch.retrying": "يعيد المحاولة",
  "batch.clarify": "يحتاج إلى توضيح",
  "batch.blank": "تحقق من الصفحات الأصلية",
  "batch.skippedBlank": "تم التخطي لأنها فارغة",
  "batch.issueOne": "مشكلة واحدة",
  "batch.issues": "{count} مشكلات",
  "batch.emDash": "—",

  "file.onePage": "{fileName} · صفحة واحدة",
  "file.pages": "{fileName} · {count} صفحات",

  "alert.choosePdfFirst": "اختر ملف PDF أولًا، ثم خطط الدفعات.",
  "alert.choosePdf": "اختر ملف PDF.",
  "alert.notPdf": "هذا الملف ليس PDF. اختر مسحًا لكتاب دراسي محفوظًا كـ PDF.",
  "alert.noPages": "لا يحتوي ملف PDF هذا على صفحات للتكييف.",
  "alert.couldNotRead": "تعذّر قراءة ملف PDF هذا. جرّب ملفًا آخر.",
  "alert.needKey":
    "الصق مفتاح واجهة لهذا المزوّد قبل التكييف. يُحفظ المفتاح في جلسة هذا المتصفح فقط.",
  "alert.needModel": "اختر نموذجًا، أو حدد نموذجًا مخصصًا وأدخل معرّف النموذج.",
  "alert.needOllamaModel": "اختر أو أدخل وسم نموذج رؤية لـ Ollama، مثل qwen2.5vl.",
  "alert.needLocalServer":
    "يحتاج Claude وOpenAI وOllama إلى المحوّل المحلي. شغّل python3 scripts/serve_adapter.py وافتح ذلك العنوان.",
  "alert.needPdf": "أسقط أو اختر ملف PDF لكتاب دراسي أولًا.",
  "alert.couldNotSplit": "تعذّر تقسيم ملف PDF هذا.",
  "alert.noClarify": "لا توجد دفعة تنتظر توضيحًا.",
  "alert.noBlankReview": "لا توجد دفعة تنتظر مراجعة صفحات فارغة.",
  "alert.typeAnswer": "اكتب إجابة حتى يتمكن Gemini من إنهاء هذه الدفعة.",
  "alert.raw": "{raw}",

  "models.groupGemini": "Gemini",
  "models.groupClaude": "Claude",
  "models.groupOpenAI": "OpenAI",
  "models.groupOllama": "Ollama",
  "effort.none": "بدون",
  "effort.low": "منخفض",
  "effort.medium": "متوسط",
  "effort.high": "مرتفع",
  "effort.xhigh": "مرتفع جدًا",
  "effort.max": "أقصى",
  "effort.off": "متوقف",
  "effort.on": "تشغيل",
  "effort.recommended": "{label} (موصى به)",

  "gemini.modelFlash38": "Gemini 3.8 Flash (موصى به)",
  "gemini.model31Pro": "Gemini 3.1 Pro",
  "gemini.rateLimitRetrying": "تم تجاوز حد المعدل. الانتظار ثم إعادة محاولة هذه الدفعة.",
  "gemini.rateLimitExhausted": "تم تجاوز حد المعدل لهذه الدفعة بعد إعادة المحاولات.",
  "gemini.unavailableRetrying":
    "Gemini غير متاح مؤقتًا. الانتظار ثم إعادة محاولة هذه الدفعة.",
  "gemini.unavailableExhausted": "كان Gemini غير متاح مؤقتًا بعد إعادة المحاولات.",
  "gemini.cancelled": "أُلغي التكييف",
  "gemini.keyRejected": "رُفض مفتاح الواجهة. تحقق من المفتاح وحاول مرة أخرى.",
  "gemini.blocked": "حظر Gemini هذه الدفعة: {reason}",
  "gemini.requestFailed": "فشل طلب Gemini (HTTP {status}).",
  "gemini.unreachable":
    "تعذّر الوصول إلى Gemini. إذا كانت هذه الصفحة محظورة من استدعاء Google، شغّل python3 scripts/serve_adapter.py واستخدم ذلك العنوان المحلي، أو عيّن عنوان وكيل.",
  "gemini.empty": "أعاد Gemini نصًا فارغًا لهذه الدفعة.",
  "gemini.failedAfterRetries": "فشل طلب Gemini بعد إعادة المحاولات.",

  "claude.modelSonnet5": "Claude Sonnet 5 (موصى به)",
  "claude.modelOpus5": "Claude Opus 5",
  "anthropic.keyRejected": "رُفض مفتاح واجهة Anthropic. تحقق من المفتاح وحاول مرة أخرى.",
  "anthropic.requestFailed": "فشل طلب Claude (HTTP {status}).",
  "anthropic.unavailableRetrying":
    "Claude غير متاح مؤقتًا. الانتظار ثم إعادة محاولة هذه الدفعة.",
  "anthropic.unavailableExhausted": "كان Claude غير متاح مؤقتًا بعد إعادة المحاولات.",
  "anthropic.failedAfterRetries": "فشل طلب Claude بعد إعادة المحاولات.",

  "openai.modelLuna": "GPT-5.6 Luna (موصى به)",
  "openai.modelTerra": "GPT-5.6 Terra",
  "openai.modelSol": "GPT-5.6 Sol",
  "openai.keyRejected": "رُفض مفتاح واجهة OpenAI. تحقق من المفتاح وحاول مرة أخرى.",
  "openai.requestFailed": "فشل طلب OpenAI (HTTP {status}).",
  "openai.unavailableRetrying":
    "OpenAI غير متاح مؤقتًا. الانتظار ثم إعادة محاولة هذه الدفعة.",
  "openai.unavailableExhausted": "كان OpenAI غير متاح مؤقتًا بعد إعادة المحاولات.",
  "openai.failedAfterRetries": "فشل طلب OpenAI بعد إعادة المحاولات.",

  "ollama.localVision": "Ollama (رؤية محلية)",
  "ollama.notLocal":
    "يعمل Ollama فقط عبر المحوّل المحلي على هذا الحاسوب. لا تستطيع GitHub Pages الوصول إلى Ollama على جهازك. شغّل python3 scripts/serve_adapter.py.",
  "ollama.loopbackOnly":
    "يعيد المحوّل التوجيه فقط إلى عنوان Ollama على loopback مثل http://127.0.0.1:11434.",
  "ollama.requestFailed": "فشل طلب Ollama (HTTP {status}).",
  "ollama.unavailableRetrying":
    "Ollama غير متاح مؤقتًا. الانتظار ثم إعادة محاولة هذه الدفعة.",
  "ollama.unavailableExhausted": "كان Ollama غير متاح مؤقتًا بعد إعادة المحاولات.",
  "ollama.failedAfterRetries": "فشل طلب Ollama بعد إعادة المحاولات.",
  "ollama.noPages": "تعذّر تحويل صفحات PDF إلى صور لـ Ollama.",
  "ollama.refreshFailed":
    "تعذّر سرد نماذج Ollama. تأكد أن المحوّل المحلي يعمل وأن نموذج رؤية قد نُزّل.",

  "runControl.remainingNotSent": "لم تُرسل الدفعات المتبقية بسبب هذا الفشل.",
  "runControl.cancelled": "أُلغي. لا تزال الدفعات المكتملة متاحة للتنزيل.",
  "runControl.pagesFailed": "فشلت الصفحات {range}: {error} {remaining}",
  "runControl.stopped":
    "توقف بعد فشل الصفحات {range}. أعد محاولة ذلك النطاق، أو تكييف الكتاب لاستئناف الدفعات المعلقة المتبقية.",
  "runControl.retryingRateLimit":
    "الصفحات {range}: تم تجاوز حد المعدل. الانتظار {seconds} ثوانٍ ثم إعادة محاولة هذه الدفعة.",
  "runControl.retryingUnavailable":
    "الصفحات {range}: Gemini غير متاح مؤقتًا. الانتظار {seconds} ثوانٍ ثم إعادة محاولة هذه الدفعة.",

  "pdf.libFailed": "فشل تحميل pdf-lib. تحقق من docs/vendor/pdf-lib.min.js.",
  "pdf.jszipFailed": "فشل تحميل JSZip. تحقق من docs/vendor/jszip.min.js.",
};
