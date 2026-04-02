import { type DeclarationContent, t } from 'intlayer';

export const customTablesTourContent = {
  key: 'custom-tables-tour-content',
  content: {
    name: t({
      ru: 'Тур по кастомным таблицам',
      en: 'Custom Tables Tour',
      kk: 'Жекелендірілген кестелер туры',
    }),
    description: t({
      ru: 'Создание и управление таблицами для экспорта',
      en: 'Create and manage export-ready tables',
      kk: 'Экспортқа дайын кестелерді жасау және басқару',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в кастомные таблицы',
          en: 'Welcome to Custom Tables',
          kk: 'Реттелетін кестелерге қош келдіңіз',
        }),
        description: t({
          ru: 'Здесь вы собираете таблицы для экспорта и отчетности: из выписок, вручную или через Google Sheets. Тур покажет основные элементы текущей страницы.',
          en: 'This page lets you build tables for exports and reporting from statements, manually, or through Google Sheets. This tour shows the key parts of the current workflow.',
          kk: 'Бұл бетте экспорт пен есептілікке арналған кестелерді үзінділерден, қолмен немесе Google Sheets арқылы жасайсыз. Тур ағымдағы беттің негізгі элементтерін көрсетеді.',
        }),
      },
      createExport: {
        title: t({
          ru: 'Создать экспортную таблицу',
          en: 'Create export table',
          kk: 'Экспорт кестесін жасау',
        }),
        description: t({
          ru: 'Основная кнопка сразу открывает сценарий создания таблицы из выписок. Это быстрый путь, если вам нужна таблица для выгрузки или дальнейшей обработки.',
          en: 'The primary action opens the flow for building a table from statements. Use it when you need a fast export-ready table for further work.',
          kk: 'Негізгі батырма үзінділерден кесте жасау сценарийін ашады. Оны әрі қарай жұмыс істеуге арналған экспорт кестесін тез дайындау үшін пайдаланыңыз.',
        }),
      },
      createDropdown: {
        title: t({
          ru: 'Другие способы создания',
          en: 'Other creation options',
          kk: 'Жасаудың басқа жолдары',
        }),
        description: t({
          ru: 'Через это меню можно создать пустую таблицу с нуля или перейти к импорту из Google Sheets, если данные уже подготовлены в другом источнике.',
          en: 'This menu gives you the alternate creation paths: start with a blank table or import from Google Sheets when the source data already exists elsewhere.',
          kk: 'Бұл мәзір арқылы бос кестені нөлден жасай аласыз немесе деректер басқа жерде дайын болса, Google Sheets импортын аша аласыз.',
        }),
      },
      search: {
        title: t({
          ru: 'Поиск по таблицам',
          en: 'Search tables',
          kk: 'Кестелерді іздеу',
        }),
        description: t({
          ru: 'Поиск помогает быстро находить нужные таблицы по названию, особенно когда у вас уже несколько экспортов под разные задачи и периоды.',
          en: 'Search helps you quickly find a table by name, especially once you have multiple exports for different workflows and periods.',
          kk: 'Іздеу атауы бойынша қажетті кестені тез табуға көмектеседі, әсіресе әртүрлі кезеңдер мен міндеттерге арналған экспорттар көбейген кезде.',
        }),
      },
      sourceFilter: {
        title: t({
          ru: 'Фильтр по источнику',
          en: 'Source filter',
          kk: 'Дереккөз сүзгісі',
        }),
        description: t({
          ru: 'Фильтруйте таблицы по происхождению: ручные, из Google Sheets или созданные из выписок. Это упрощает навигацию по рабочим наборам данных.',
          en: 'Filter tables by where they came from: manual, Google Sheets, or statement-based. It is the quickest way to narrow the list to one workflow.',
          kk: 'Кестелерді шығу көзі бойынша сүзіңіз: қолмен жасалған, Google Sheets-тен келген немесе үзінділерден құрылған. Бұл тізімді бір жұмыс ағынына тез қысқартады.',
        }),
      },
      tablesList: {
        title: t({
          ru: 'Список таблиц',
          en: 'Tables list',
          kk: 'Кестелер тізімі',
        }),
        description: t({
          ru: 'Здесь собраны все созданные таблицы. В каждой строке видны назначение, источник, количество строк, дата обновления и быстрые действия.',
          en: 'This area shows every table you have created. Each row surfaces the purpose, source, row count, last update, and quick actions.',
          kk: 'Мұнда барлық жасалған кестелер көрсетіледі. Әр жолда мақсаты, дереккөзі, жол саны, соңғы жаңартылуы және жылдам әрекеттер беріледі.',
        }),
      },
      pagination: {
        title: t({
          ru: 'Навигация по списку',
          en: 'List navigation',
          kk: 'Тізім навигациясы',
        }),
        description: t({
          ru: 'Если таблиц много, используйте пагинацию, чтобы переходить между страницами результатов и контролировать текущий диапазон отображения.',
          en: 'When the list grows, use pagination to move through result pages and keep track of the visible range.',
          kk: 'Кестелер көбейгенде, беттеу арқылы нәтижелер беттері арасында ауысып, көрсетіліп тұрған ауқымды бақылаңыз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете, где создавать, искать и фильтровать кастомные таблицы. Дальше можно открыть нужную таблицу и работать уже с ее структурой и данными.',
          en: 'You now know where to create, find, and filter custom tables. From here you can open the right table and work with its structure and data.',
          kk: 'Енді сіз реттелетін кестелерді қайдан жасау, табу және сүзу керегін білесіз. Келесі қадамда қажетті кестені ашып, оның құрылымы мен деректерімен жұмыс істей аласыз.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default customTablesTourContent;
