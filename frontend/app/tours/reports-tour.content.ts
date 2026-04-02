import { type DeclarationContent, t } from 'intlayer';

export const reportsTourContent = {
  key: 'reports-tour-content',
  content: {
    name: t({
      ru: 'Тур по отчетам',
      en: 'Reports Tour',
      kk: 'Есептер туры',
    }),
    description: t({
      ru: 'Создание финансовых отчетов из готовых шаблонов',
      en: 'Create financial reports from ready-made templates',
      kk: 'Дайын үлгілерден қаржылық есептер жасау',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в отчеты',
          en: 'Welcome to Reports',
          kk: 'Есептерге қош келдіңіз',
        }),
        description: t({
          ru: 'На этой странице вы выбираете шаблон отчета, задаете период и выгружаете результат в нужном формате. Тур покажет текущий рабочий сценарий.',
          en: 'This page lets you choose a report template, set the period, and export the result in the format you need. This tour walks through the current workflow.',
          kk: 'Бұл бетте есеп үлгісін таңдап, кезеңді орнатып, нәтижені керек форматта жүктейсіз. Тур ағымдағы жұмыс ағынын көрсетеді.',
        }),
      },
      tabs: {
        title: t({
          ru: 'Разделы страницы',
          en: 'Page sections',
          kk: 'Бет бөлімдері',
        }),
        description: t({
          ru: 'Верхние вкладки переключают между шаблонами и историей уже созданных отчетов. Это основная навигация внутри страницы.',
          en: 'These tabs switch between available templates and the history of generated reports. They are the main navigation inside this page.',
          kk: 'Жоғарғы қойындылар қолжетімді үлгілер мен бұрын жасалған есептер тарихы арасында ауыстырады. Бұл осы беттің негізгі навигациясы.',
        }),
      },
      templates: {
        title: t({
          ru: 'Шаблоны отчетов',
          en: 'Report templates',
          kk: 'Есеп үлгілері',
        }),
        description: t({
          ru: 'Здесь собраны доступные типы отчетов. Выбирайте шаблон в зависимости от того, хотите ли вы посмотреть прибыль и убытки, баланс, движение денег или расходы по категориям.',
          en: 'This grid contains the available report types. Pick a template based on whether you want profit and loss, balance, cash flow, or category spending.',
          kk: 'Мұнда қолжетімді есеп түрлері жиналған. Пайда мен шығынды, балансты, ақша ағынын немесе санаттар бойынша шығыстарды көру үшін сәйкес үлгіні таңдаңыз.',
        }),
      },
      selectTemplate: {
        title: t({
          ru: 'Выбор шаблона',
          en: 'Select a template',
          kk: 'Үлгіні таңдау',
        }),
        description: t({
          ru: 'Карточка P&L открывает панель настройки отчета. После выбора можно задать период и формат перед генерацией файла.',
          en: 'The P&L card opens the report setup panel. After selecting it, you can configure the period and export format before generating the file.',
          kk: 'P&L картасы есепті баптау панелін ашады. Таңдағаннан кейін файлды жасамас бұрын кезең мен экспорт форматын орната аласыз.',
        }),
      },
      generator: {
        title: t({
          ru: 'Панель генерации',
          en: 'Generation panel',
          kk: 'Жасау панелі',
        }),
        description: t({
          ru: 'В этой панели вы задаете период отчета и проверяете, какой шаблон сейчас активен. Это центральная точка перед выгрузкой документа.',
          en: 'This panel is where you set the reporting period and confirm which template is active. It is the main control area before export.',
          kk: 'Осы панельде есеп кезеңін орнатып, қай үлгінің белсенді екенін тексересіз. Бұл экспорт алдында қолданылатын негізгі басқару аймағы.',
        }),
      },
      format: {
        title: t({
          ru: 'Формат выгрузки',
          en: 'Export format',
          kk: 'Экспорт форматы',
        }),
        description: t({
          ru: 'Выберите формат под задачу: Excel для дальнейшей работы, PDF для отправки или CSV для обработки данных в других системах.',
          en: 'Choose the output format that fits the job: Excel for further editing, PDF for sharing, or CSV for downstream processing.',
          kk: 'Мақсатқа сай форматты таңдаңыз: әрі қарай өңдеу үшін Excel, жіберу үшін PDF немесе басқа жүйелерде өңдеу үшін CSV.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете, где выбрать шаблон и как подготовить отчет к выгрузке. Следующий шаг - сгенерировать нужный документ и скачать его.',
          en: 'You now know where to choose a template and how to prepare a report for export. The next step is to generate the document you need and download it.',
          kk: 'Енді сіз үлгіні қайдан таңдап, есепті экспортқа қалай дайындау керегін білесіз. Келесі қадам - қажет құжатты жасап, жүктеп алу.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default reportsTourContent;
