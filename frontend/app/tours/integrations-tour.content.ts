import { type DeclarationContent, t } from 'intlayer';

export const integrationsTourContent = {
  key: 'integrations-tour-content',
  content: {
    name: t({
      ru: 'Тур по интеграциям',
      en: 'Integrations Tour',
      kk: 'Интеграциялар туры',
    }),
    description: t({
      ru: 'Подключение внешних сервисов к Lumio',
      en: 'Connect external services to Lumio',
      kk: 'Lumio-ға сыртқы сервистерді қосу',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в интеграции',
          en: 'Welcome to Integrations',
          kk: 'Интеграцияларға қош келдіңіз',
        }),
        description: t({
          ru: 'На этой странице собраны доступные подключения к внешним сервисам. Здесь вы выбираете нужный инструмент и переходите к его настройке.',
          en: 'This page lists the external services that can connect to Lumio. It is the starting point for choosing a tool and opening its setup flow.',
          kk: 'Бұл бетте Lumio-ға қосыла алатын сыртқы сервистер жиналған. Қажетті құралды таңдап, оны баптау ағынына өтетін негізгі орын осы.',
        }),
      },
      search: {
        title: t({
          ru: 'Поиск интеграций',
          en: 'Search integrations',
          kk: 'Интеграцияларды іздеу',
        }),
        description: t({
          ru: 'Поиск помогает быстро найти нужную интеграцию по названию или описанию, особенно когда список подключений становится длиннее.',
          en: 'Search helps you quickly find an integration by name or description, especially as the catalog grows.',
          kk: 'Іздеу атауы немесе сипаттамасы бойынша қажетті интеграцияны тез табуға көмектеседі, әсіресе каталог үлкейген кезде.',
        }),
      },
      available: {
        title: t({
          ru: 'Доступные интеграции',
          en: 'Available integrations',
          kk: 'Қолжетімді интеграциялар',
        }),
        description: t({
          ru: 'В этом разделе показаны сервисы, которые можно подключить. Карточки сгруппированы по типу, чтобы проще ориентироваться среди хранилищ, почты, таблиц и мессенджеров.',
          en: 'This section lists services that are ready to be connected. Cards are grouped by category so it is easier to browse storage, email, spreadsheets, and messaging tools.',
          kk: 'Бұл бөлімде қосуға болатын сервистер көрсетіледі. Карточкалар түрі бойынша топталған, сондықтан сақтау, пошта, кестелер және мессенджерлер арасында жүру оңайырақ.',
        }),
      },
      googleSheets: {
        title: t({
          ru: 'Google Sheets',
          en: 'Google Sheets',
          kk: 'Google Sheets',
        }),
        description: t({
          ru: 'Карточка Google Sheets ведет в отдельный сценарий настройки интеграции. Отсюда начинается подключение таблиц для импорта, экспорта и синхронизации данных.',
          en: 'The Google Sheets card opens the dedicated setup flow. Use it to start connecting spreadsheets for import, export, and data sync.',
          kk: 'Google Sheets картасы бөлек баптау ағынын ашады. Оны кестелерді импорт, экспорт және деректерді синхрондау үшін қосуды бастауға пайдаланыңыз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете, где искать и открывать интеграции. Следующий шаг - перейти в нужную карточку и закончить настройку конкретного сервиса.',
          en: 'You now know where to search and open integrations. The next step is to enter the right card and complete setup for the specific service.',
          kk: 'Енді интеграцияларды қайдан іздеп, қалай ашу керегін білесіз. Келесі қадам - қажетті картаны ашып, нақты сервисті толық баптау.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default integrationsTourContent;
