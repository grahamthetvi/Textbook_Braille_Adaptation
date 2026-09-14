/** Arabic UI catalog. Keys must stay in sync with en.js and es.js. */

export const ar = {
  "header.title": "محوّل الكتب الدراسية",
  "header.eyebrow": "تجهيز كتب دراسية ميسّرة",
  "header.lede":
    "أسقط ملف PDF ممسوحًا لكتاب دراسي، والصق مفتاح واجهة Gemini، ثم نزّل ماركداون ميسرًا لقارئات الشاشة. يبقى المفتاح في جلسة هذا المتصفح ويُرسل فقط إلى Google Gemini، أو إلى وكيل اختياري تعيّنه.",
  "header.skipLink": "تخطَّ إلى المحتوى الرئيسي",
  "header.toolbarLabel": "اللغة والعرض",
  "header.language": "اللغة",
  "header.languageHint":
    "يطرح Gemini أسئلة التوضيح بهذه اللغة ويعلّم الكلمات غير المقروءة بهذه اللغة. يبقى نص الدرس المطبوع بلغة الكتاب.",
  "header.themeDark": "الوضع الليلي",
  "header.themeLight": "الوضع النهاري",

  "form.geminiAccess": "الوصول إلى Gemini",
  "form.apiKey": "مفتاح واجهة Gemini",
  "form.apiKeyHintHtml":
    'أنشئ مفتاح واجهة Gemini في <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. مطلوب للتحويل. لا يُكتب على القرص. يُستخدم تخزين الجلسة فقط إذا حددت المربع أدناه.',
  "form.setupSummary": "كيفية ربط Gemini 3.8 Flash",
  "form.setupStep1Html":
    'افتح <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">مفاتيح واجهة Google AI Studio</a> وسجّل الدخول بحساب Google الذي ستُحاسب عليه.',
  "form.setupStep2Html":
    "أنشئ مفتاح واجهة في مشروع Google Cloud. إذا طُلب منك، فعّل <strong>واجهة Gemini</strong> (Generative Language API) لذلك المشروع.",
  "form.setupStep3Html":
    "الصق المفتاح في الحقل أعلاه. اترك <strong>النموذج</strong> على Gemini 3.8 Flash. معرّف واجهة Google هو <code>gemini-3.8-flash</code>.",
  "form.setupStep4Html":
    "لا تكتب أسماء Cursor مثل <code>gemini-3.8-flash-medium</code> في النموذج المخصص. تلك ليست معرّفات صالحة لواجهة Google.",
  "form.setupStep5Html":
    "إذا تعذّر على هذه الصفحة الوصول إلى Google من المتصفح، شغّل <code>python3 scripts/serve_adapter.py</code> وعيّن الوكيل إلى <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "تذكّر المفتاح في هذه الجلسة",
  "form.model": "النموذج",
  "form.modelHint": "استخدم Gemini 3.8 Flash ما لم يكن مفتاح أقدم غير قادر على استدعاء ذلك النموذج.",
  "form.customModel": "نموذج مخصص",
  "form.batchSize": "حجم الدفعة المفضل",
  "form.latexMath": "تغليف الرياضيات بـ LaTeX (لنيمث)",
  "form.latexHint":
    "متوقف افتراضيًا: تُقرأ الرياضيات كنص عادي. عند التحديد، يغلّف Gemini الرياضيات بـ LaTeX ليُحوَّل لاحقًا إلى نيمث.",
  "form.advancedSummary": "متقدم: عنوان وكيل اختياري",
  "form.proxyUrl": "عنوان الوكيل",
  "form.proxyHint":
    "اتركه فارغًا لاستدعاء Google Gemini من هذا المتصفح. عيّن وكيلًا إذا تعذّر وصول هذه الصفحة إلى Google، باستخدام مضيف يمرّر generateContent.",
  "form.pdfLegend": "ملف PDF للكتاب الدراسي",
  "form.dropLead": "أسقط هنا ملف PDF لكتاب دراسي",
  "form.dropOr": "أو",
  "form.filePicker": "ملف PDF",
  "form.noFile": "لم يُحمَّل أي ملف.",
  "form.planBatches": "تخطيط الدفعات",
  "form.adaptBook": "تحويل الكتاب",
  "form.cancel": "إلغاء",
  "form.fileMeta": "{fileName} · {pages}",
  "form.pageOne": "صفحة واحدة",
  "form.pageMany": "{count} صفحات",

  "status.idle": "حمّل ملف PDF لتخطيط الدفعات. لا يُستدعى Gemini حتى تبدأ التحويل.",
  "status.plannedOne":
    "خُطِّطت دفعة واحدة من {pageCount} صفحات. لا يُستدعى Gemini حتى تبدأ التحويل.",
  "status.plannedMany":
    "خُطِّطت {count} دفعات من {pageCount} صفحات. لا يُستدعى Gemini حتى تبدأ التحويل.",
  "status.splitting": "جارٍ تقسيم ملف PDF إلى دفعات…",
  "status.batchProgress": "الدفعة {index} من {total}: الصفحات {pageRange}",
  "status.batchRetrying": "الدفعة {index} من {total}. {detail}",
  "status.pausedClarify":
    "توقف عند الصفحات {pageRange}. يحتاج Gemini إلى توضيح قبل إنهاء تلك الدفعة.",
  "status.pausedBlank":
    "توقف عند الصفحات {pageRange}. لم يُرجع Gemini نصًا. قارن الصفحات الأصلية، ثم تخطَّها إن كانت فارغة أو أعد المحاولة إن كان فيها محتوى.",
  "status.noPending": "لا توجد دفعات معلّقة. أعد محاولة صف فاشل، أو نزّل ما اكتمل.",
  "status.finishedFailed":
    "اكتملت {done} من {total} دفعات. أعد محاولة الصفوف الفاشلة أو نزّل ما انتهى.",
  "status.finishedOk": "اكتملت {done} من {total} دفعات. يمكنك تنزيل الماركداون الميسّر.",
  "status.stopped": "توقف التحويل.",
  "status.skippedContinue":
    "تُخطِّيت الصفحات {pageRange} لأنها فارغة. جارٍ المتابعة مع الدفعات المتبقية.",
  "status.skippedFinished":
    "تُخطِّيت الصفحات {pageRange} لأنها فارغة. اكتملت {done} من {total} دفعات.",

  "errors.choosePdfFirst": "اختر ملف PDF أولًا، ثم خطط الدفعات.",
  "errors.choosePdfFile": "اختر ملف PDF.",
  "errors.notPdf": "هذا الملف ليس PDF. اختر مسحًا لكتاب دراسي محفوظًا بتنسيق PDF.",
  "errors.noPages": "لا يحتوي ملف PDF هذا على صفحات للتحويل.",
  "errors.readPdf": "تعذّر قراءة ملف PDF هذا. جرّب ملفًا آخر.",
  "errors.needApiKey":
    "الصق مفتاح واجهة Gemini قبل التحويل. يُحفظ المفتاح في جلسة هذا المتصفح فقط.",
  "errors.needModel": "اختر نموذجًا، أو حدد نموذجًا مخصصًا وأدخل معرّف النموذج.",
  "errors.needPdf": "أسقط أو اختر أولًا ملف PDF لكتاب دراسي.",
  "errors.splitPdf": "تعذّر تقسيم ملف PDF هذا.",
  "errors.noBlankReview": "لا توجد دفعة بانتظار مراجعة صفحات فارغة.",
  "errors.noClarify": "لا توجد دفعة بانتظار توضيح.",
  "errors.needClarifyAnswer": "اكتب إجابة حتى يتمكن Gemini من إنهاء هذه الدفعة.",
  "errors.batchFailed": "فشلت هذه الدفعة.",
  "errors.failedRow": "الصفحات {pageRange}: {error}",
  "errors.heading": "دفعات فاشلة",
  "errors.hint":
    "دفعة فاشلة أو سؤال توضيح أو مخرجات فارغة توقف التشغيل. لا تُرسل النطاقات المعلّقة المتبقية. حدود المعدل تنتظر وتعيد محاولة الدفعة الحالية دون توقف. أعد محاولة صف فاشل، أو أجب عن توضيح، أو تخطَّ المخرجات الفارغة أو أعد المحاولة، أو اضغط تحويل الكتاب لاستئناف الدفعات المعلّقة. تبقى الدفعات المكتملة قابلة للتنزيل.",
  "errors.retry": "إعادة المحاولة",

  "blank.heading": "مخرجات فارغة — راجع الصفحات الأصلية",
  "blank.hint":
    "لم يُرجع Gemini نصًا لهذه الدفعة. قد يعني ذلك أن صفحات المصدر فارغة، أو أن النموذج فاته المحتوى المطبوع. قارن الصفحات الأصلية، ثم تخطَّها إن كانت فارغة أو أعد المحاولة إن كان فيها نص الدرس. تنتظر الدفعات المعلّقة المتبقية حتى تختار.",
  "blank.skip": "تخطي لأنها فارغة",
  "blank.retry": "إعادة محاولة هذه الدفعة",
  "blank.sourcePage": "صفحة المصدر {page}",
  "blank.downloadPage": "تنزيل صفحة المصدر {page}",
  "blank.downloadSuffix": " إذا أردت ملف PDF الأصلي.",
  "blank.ariaLabel": "المسح الأصلي لصفحة المصدر {page}",
  "blank.drawFail": "تعذّر رسم هذه الصفحة. استخدم رابط التنزيل لمعاينتها.",
  "blank.loading": "جارٍ تحميل الصفحات الأصلية…",
  "blank.noPdf": "ملف PDF الأصلي لم يعد متاحًا في هذه الجلسة.",
  "blank.renderFail":
    "تعذّر عرض الصفحات الأصلية. تخطَّها إن كانت فارغة، أو أعد المحاولة إن كان فيها محتوى.",
  "blank.emptyMessage": "أرجع Gemini نصًا فارغًا لهذه الدفعة.",
  "blank.pages": "الصفحات {pageRange}",

  "clarify.heading": "يلزم توضيح",
  "clarify.hint":
    "أوقف Gemini هذه الدفعة. ربما يكون قد بدأ النسخ بالفعل. أجب عن السؤال للمتابعة؛ تُرسل المسودة وإجابتك إلى Gemini. تنتظر الدفعات المعلّقة المتبقية حتى تنتهي هذه. يمكنك أيضًا إعادة المحاولة من البداية دون إجابة.",
  "clarify.draftHeading": "المسودة حتى الآن",
  "clarify.answer": "إجابتك",
  "clarify.continue": "متابعة هذه الدفعة",
  "clarify.retry": "إعادة المحاولة من البداية",
  "clarify.missingQuestion": "طرح Gemini سؤالًا لكنه لم يضمّن النص.",
  "clarify.pages": "الصفحات {pageRange}",

  "issues.heading": "مسائل الأسلوب",
  "issues.hint":
    "بعد انتهاء الدفعة تُدرج هنا المحارف المحظورة مثل وعلامة العطف والنجمة وعلامة الرقم والأقواس المربعة والأقواس المعقوفة. لا توقف التشغيل. انقر عددًا في التقدم للانتقال إلى ذلك النطاق. تظهر الكلمات غير المقروءة كـ (غير واضح) في النص المُنزَّل، وليس في هذه القائمة.",

  "download.heading": "تنزيل",
  "download.hint":
    "تشمل التنزيلات الدفعات المكتملة فقط، حتى إن كانت بعض الصفوف ما تزال بحاجة إلى إعادة محاولة.",
  "download.docx": "تنزيل مستند Word",
  "download.markdown": "تنزيل الماركداون المدمج",
  "download.zip": "تنزيل zip",

  "progress.heading": "التقدم",
  "progress.label": "الدفعات المكتملة",
  "progress.batchListLabel": "حالة الدفعات",
  "progress.noBatches": "لم تُخطط أي دفعات بعد.",
  "progress.pages": "الصفحات {pageRange}",
  "progress.retrying": "جارٍ إعادة المحاولة",
  "progress.clarify": "يحتاج إلى توضيح",
  "progress.blank": "راجع الصفحات الأصلية",
  "progress.pending": "معلّق",
  "progress.running": "قيد التشغيل",
  "progress.done": "تم",
  "progress.error": "خطأ",
  "progress.skippedBlank": "تُخطِّي فارغ",
  "progress.issueOne": "مشكلة واحدة",
  "progress.issueMany": "{count} مشكلات",
  "progress.dash": "—",

  "gemini.modelFlash38": "Gemini 3.8 Flash (موصى به)",
  "gemini.modelFlash25": "Gemini 2.5 Flash",
  "gemini.modelPro25": "Gemini 2.5 Pro",
  "gemini.modelFlash20": "Gemini 2.0 Flash",
  "gemini.rateLimitRetrying": "تم بلوغ حد المعدل. انتظار ثم إعادة محاولة هذه الدفعة.",
  "gemini.rateLimitExhausted": "بلغت هذه الدفعة حد المعدل بعد إعادة المحاولات.",
  "gemini.unavailableRetrying":
    "Gemini غير متاح مؤقتًا. انتظار ثم إعادة محاولة هذه الدفعة.",
  "gemini.unavailableExhausted": "كان Gemini غير متاح مؤقتًا بعد إعادة المحاولات.",
  "gemini.apiKeyRejected": "رُفض مفتاح الواجهة. تحقق من المفتاح وحاول مرة أخرى.",
  "gemini.blocked": "حظر Gemini هذه الدفعة: {reason}",
  "gemini.requestFailed": "فشل طلب Gemini (HTTP {status}).",
  "gemini.unreachable":
    "تعذّر الوصول إلى Gemini. إذا حُظرت هذه الصفحة من استدعاء Google، شغّل python3 scripts/serve_adapter.py واستخدم ذلك العنوان المحلي، أو عيّن عنوان وكيل.",
  "gemini.failedRetries": "فشل طلب Gemini بعد إعادة المحاولات.",
  "gemini.cancelled": "أُلغي التحويل",

  "runControl.remainingNotSent": "لم تُرسل الدفعات المتبقية بسبب هذا الفشل.",
  "runControl.cancelled": "أُلغي. ما تزال الدفعات المكتملة متاحة للتنزيل.",
  "runControl.failedAlert": "فشلت الصفحات {pageRange}: {error} {remaining}",
  "runControl.stoppedStatus":
    "توقف بعد فشل الصفحات {pageRange}. أعد محاولة ذلك النطاق، أو اضغط تحويل الكتاب لاستئناف الدفعات المعلّقة المتبقية.",
  "runControl.retryingRateLimit":
    "الصفحات {pageRange}: تم بلوغ حد المعدل. انتظار {seconds} ث ثم إعادة محاولة هذه الدفعة.",
  "runControl.retryingUnavailable":
    "الصفحات {pageRange}: Gemini غير متاح مؤقتًا. انتظار {seconds} ث ثم إعادة محاولة هذه الدفعة.",
};
