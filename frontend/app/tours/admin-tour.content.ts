import { type DeclarationContent, t } from 'intlayer';

const adminTourContent = {
  key: 'admin-tour-content',
  content: {
    name: t({
      ru: 'Тур по админ-панели',
      en: 'Admin Panel Tour',
      kk: 'Әкімші панелі туры',
    }),
    description: t({
      ru: 'Обзор административных инструментов',
      en: 'Overview of administrative tools',
      kk: 'Әкімшілік құралдарға шолу',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в админ-панель',
          en: 'Welcome to Admin Panel',
          kk: 'Әкімші панеліне қош келдіңіз',
        }),
        description: t({
          ru: 'Админ-панель помогает просматривать системные данные, переходить к управлению пользователями и анализировать аудит действий.',
          en: 'The admin panel gives you access to system-level data, user management entry points, and audit review tools.',
          kk: 'Әкімші панелі жүйелік деректерді көруге, пайдаланушыларды басқару бөліміне өтуге және әрекеттер аудитін талдауға мүмкіндік береді.',
        }),
      },
      tabs: {
        title: t({
          ru: 'Основные вкладки',
          en: 'Main tabs',
          kk: 'Негізгі қойындылар',
        }),
        description: t({
          ru: 'Верхние вкладки переключают между журналом выписок, разделом пользователей и аудитом. Это основная навигация внутри админки.',
          en: 'These top tabs switch between statements log, users, and audit. They are the main navigation points inside the admin area.',
          kk: 'Жоғарғы қойындылар үзінділер журналы, пайдаланушылар және аудит арасында ауыстырады. Бұл әкімші аймағындағы негізгі навигация.',
        }),
      },
      statementsLog: {
        title: t({
          ru: 'Поиск по журналу выписок',
          en: 'Statements log search',
          kk: 'Үзінділер журналы бойынша іздеу',
        }),
        description: t({
          ru: 'Через поиск можно быстро находить загруженные выписки по названию файла или банку и затем разбирать ошибки, повторную обработку или удаление.',
          en: 'Use this search to quickly find uploaded statements by file name or bank before reviewing errors, reprocessing, or deletion.',
          kk: 'Бұл іздеу арқылы жүктелген үзінділерді файл атауы немесе банк бойынша тез тауып, содан кейін қателерді, қайта өңдеуді немесе жоюды қарауға болады.',
        }),
      },
      usersLink: {
        title: t({
          ru: 'Переход к пользователям',
          en: 'Open users management',
          kk: 'Пайдаланушылар бөліміне өту',
        }),
        description: t({
          ru: 'Кнопка открывает отдельный административный экран управления пользователями, где доступны роли, статусы и права.',
          en: 'This button opens the dedicated admin users screen where roles, statuses, and permissions are managed.',
          kk: 'Бұл батырма рөлдер, күйлер және рұқсаттар басқарылатын бөлек әкімшілік пайдаланушылар экранын ашады.',
        }),
      },
      auditFilters: {
        title: t({
          ru: 'Фильтры аудита',
          en: 'Audit filters',
          kk: 'Аудит сүзгілері',
        }),
        description: t({
          ru: 'В аудит-разделе фильтры помогают сузить список событий по сущности, пользователю, действию, severity и периоду времени.',
          en: 'In the audit section, these filters narrow events by entity, user, action, severity, and time range.',
          kk: 'Аудит бөлімінде бұл сүзгілер оқиғаларды мән, пайдаланушы, әрекет, severity және уақыт аралығы бойынша қысқартады.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете базовую структуру админ-панели. Дальше можно перейти в нужную вкладку и работать уже с конкретными административными задачами.',
          en: 'You now know the basic structure of the admin panel. From here you can move into the right tab and work on the specific administrative task you need.',
          kk: 'Енді әкімші панелінің негізгі құрылымын білесіз. Осы жерден қажетті қойындыға өтіп, нақты әкімшілік міндетпен жұмыс істей аласыз.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default adminTourContent;
