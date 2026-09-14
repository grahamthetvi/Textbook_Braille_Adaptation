/** Arabic UI catalog for the textbook adapter. */

export const ar = {
  "header.title": "محوّل الكتب الدراسية",
  "header.skip": "تخطي إلى المحتوى الرئيسي",
  "header.eyebrow": "إعداد كتب دراسية ميسّرة",
  "header.lede":
    "أسقط ملف PDF ممسوحًا لكتاب دراسي، والصق مفتاح واجهة Gemini، ثم نزّل ماركداون ميسّرًا لقارئات الشاشة. يبقى المفتاح في جلسة هذا المتصفح ويُرسل فقط إلى Google Gemini، أو إلى وكيل اختياري تحدده.",

  "toolbar.displayOptions": "خيارات العرض",
  "toolbar.language": "اللغة",
  "toolbar.darkMode": "الوضع الداكن",
  "header.languageHint":
    "يطرح Gemini أسئلة التوضيح بهذه اللغة ويعلّم الكلمات غير المقروءة بهذه اللغة. يبقى نص الدرس المطبوع بلغة الكتاب.",

  "form.geminiAccess": "الوصول إلى Gemini",
  "form.apiKey": "مفتاح واجهة Gemini",
  "form.apiKeyHint":
    'أنشئ مفتاح واجهة Gemini في <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. مطلوب للتكييف. لا يُكتب على القرص. يُستخدم تخزين الجلسة فقط إذا حددت المربع أدناه.',
  "form.setupSummary": "كيفية توصيل Gemini 3.8 Flash",
  "form.setupStep1":
    'افتح <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">مفاتيح واجهة Google AI Studio</a> وسجّل الدخول بحساب Google الذي ستُفوَّت عليه التكلفة.',
  "form.setupStep2":
    "أنشئ مفتاح واجهة في مشروع Google Cloud. إذا طُلب منك ذلك، فعّل <strong>واجهة Gemini</strong> (Generative Language API) لذلك المشروع.",
  "form.setupStep3":
    "الصق المفتاح في الحقل أعلاه. اترك <strong>النموذج</strong> على Gemini 3.8 Flash. معرّف واجهة Google هو <code>gemini-3.8-flash</code>.",
  "form.setupStep4":
    "لا تكتب أسماء Cursor مثل <code>gemini-3.8-flash-medium</code> في النموذج المخصص. تلك ليست معرّفات صالحة لواجهة Google.",
  "form.setupStep5":
    "إذا تعذّر على هذه الصفحة الوصول إلى Google من المتصفح، شغّل <code>python3 scripts/serve_adapter.py</code> واضبط الوكيل على <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "تذكّر المفتاح في هذه الجلسة",
  "form.model": "النموذج",
  "form.modelHint": "استخدم Gemini 3.8 Flash ما لم يكن مفتاح أقدم غير قادر على استدعاء ذلك النموذج.",
  "form.customModel": "نموذج مخصص",
  "form.batchSize": "حجم الدفعة المفضل",
  "form.latexMath": "تغليف الرياضيات بـ LaTeX (لنيمث)",
  "form.latexHint":
    "متوقف افتراضيًا: تُنطق الرياضيات كنص عادي. عند التحديد، يغلّف Gemini الرياضيات بـ LaTeX ليُحوَّل لاحقًا إلى نيمث.",
  "form.advanced": "متقدم: عنوان وكيل اختياري",
  "form.proxyUrl": "عنوان الوكيل",
  "form.proxyHint":
    "اتركه فارغًا لاستدعاء Google Gemini من هذا المتصفح. عيّن وكيلًا إذا تعذّر على هذه الصفحة الوصول إلى Google، باستخدام مضيف يعيد توجيه generateContent.",
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

  "status.loadPdf": "حمّل ملف PDF لتخطيط الدفعات. لا يُستدعى Gemini حتى تبدأ التكييف.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "تم تخطيط دفعة واحدة من {count} صفحات. لا يُستدعى Gemini حتى تبدأ التكييف.",
  "status.plannedMany":
    "تم تخطيط {batches} دفعات من {count} صفحات. لا يُستدعى Gemini حتى تبدأ التكييف.",
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

  "issues.heading": "مسائل الأسلوب",
  "issues.hint":
    "بعد انتهاء الدفعة تُدرج هنا المحارف المحظورة مثل علامة العطف والنجمة وعلامة الرقم والأقواس المربعة والأقواس المعقوفة. لا توقف التشغيل. انقر عددًا في التقدم للانتقال إلى ذلك النطاق. تظهر الكلمات غير المقروءة كـ (غير واضح) في النص المُنزَّل، وليس في هذه القائمة.",

  "file.onePage": "{fileName} · صفحة واحدة",
  "file.pages": "{fileName} · {count} صفحات",

  "alert.choosePdfFirst": "اختر ملف PDF أولًا، ثم خطط الدفعات.",
  "alert.choosePdf": "اختر ملف PDF.",
  "alert.notPdf": "هذا الملف ليس PDF. اختر مسحًا لكتاب دراسي محفوظًا كـ PDF.",
  "alert.noPages": "لا يحتوي ملف PDF هذا على صفحات للتكييف.",
  "alert.couldNotRead": "تعذّر قراءة ملف PDF هذا. جرّب ملفًا آخر.",
  "alert.needKey":
    "الصق مفتاح واجهة Gemini قبل التكييف. يُحفظ المفتاح في جلسة هذا المتصفح فقط.",
  "alert.needModel": "اختر نموذجًا، أو حدد نموذجًا مخصصًا وأدخل معرّف النموذج.",
  "alert.needPdf": "أسقط أو اختر ملف PDF لكتاب دراسي أولًا.",
  "alert.couldNotSplit": "تعذّر تقسيم ملف PDF هذا.",
  "alert.noClarify": "لا توجد دفعة تنتظر توضيحًا.",
  "alert.noBlankReview": "لا توجد دفعة تنتظر مراجعة صفحات فارغة.",
  "alert.typeAnswer": "اكتب إجابة حتى يتمكن Gemini من إنهاء هذه الدفعة.",
  "alert.raw": "{raw}",

  "gemini.modelFlash38": "Gemini 3.8 Flash (موصى به)",
  "gemini.model25Flash": "Gemini 2.5 Flash",
  "gemini.model25Pro": "Gemini 2.5 Pro",
  "gemini.model20Flash": "Gemini 2.0 Flash",
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
