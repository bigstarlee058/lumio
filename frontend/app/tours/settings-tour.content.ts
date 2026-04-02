import { type DeclarationContent, t } from 'intlayer';

export const settingsTourContent = {
  key: 'settings-tour-content',
  content: {
    name: t({
      ru: 'Тур по рабочему пространству',
      en: 'Workspace Tour',
      kk: 'Жұмыс кеңістігі туры',
    }),
    description: t({
      ru: 'Обзор профиля и настроек рабочего пространства',
      en: 'Overview of workspace profile and defaults',
      kk: 'Жұмыс кеңістігі профилі мен әдепкі баптауларына шолу',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в рабочее пространство',
          en: 'Welcome to Workspace',
          kk: 'Жұмыс кеңістігіне қош келдіңіз',
        }),
        description: t({
          ru: 'Эта страница помогает управлять основными настройками рабочего пространства: названием, валютой по умолчанию и визуальным оформлением.',
          en: 'This page is for managing the core workspace settings: name, default currency, and visual appearance.',
          kk: 'Бұл бет жұмыс кеңістігінің негізгі баптауларын басқаруға арналған: атауы, әдепкі валютасы және визуалдық көрінісі.',
        }),
      },
      sidePanel: {
        title: t({
          ru: 'Обзор раздела',
          en: 'Overview section',
          kk: 'Шолу бөлімі',
        }),
        description: t({
          ru: 'Здесь собраны основные настройки текущего рабочего пространства. Это отправная точка для изменения профиля и базовых параметров.',
          en: 'This area contains the main settings for the current workspace. It is the starting point for editing profile details and defaults.',
          kk: 'Мұнда ағымдағы жұмыс кеңістігінің негізгі баптаулары жиналған. Бұл профиль деректері мен базалық параметрлерді өзгертуге арналған бастапқы аймақ.',
        }),
      },
      workspaceName: {
        title: t({
          ru: 'Название рабочего пространства',
          en: 'Workspace name',
          kk: 'Жұмыс кеңістігінің атауы',
        }),
        description: t({
          ru: 'Измените название, если рабочее пространство нужно переименовать для команды, клиента или нового сценария использования.',
          en: 'Update this field when the workspace needs a clearer name for your team, client, or current use case.',
          kk: 'Жұмыс кеңістігін команда, клиент немесе ағымдағы қолдану сценарийі үшін қайта атау қажет болса, осы өрісті өзгертіңіз.',
        }),
      },
      workspaceCurrency: {
        title: t({
          ru: 'Валюта по умолчанию',
          en: 'Default currency',
          kk: 'Әдепкі валюта',
        }),
        description: t({
          ru: 'Через это поле выбирается валюта по умолчанию для нового ввода и связанных финансовых сценариев внутри рабочего пространства.',
          en: 'This control sets the default currency used for new entries and other financial flows inside the workspace.',
          kk: 'Бұл басқару элементі жаңа жазбалар мен жұмыс кеңістігіндегі басқа қаржылық сценарийлер үшін қолданылатын әдепкі валютаны орнатады.',
        }),
      },
      workspaceBackground: {
        title: t({
          ru: 'Фон рабочего пространства',
          en: 'Workspace background',
          kk: 'Жұмыс кеңістігінің фоны',
        }),
        description: t({
          ru: 'Здесь можно выбрать изображение для карточки рабочего пространства и обновить его визуальное оформление без изменения остальных настроек.',
          en: 'Use this section to choose the image shown on the workspace card and refresh its visual identity without changing other settings.',
          kk: 'Бұл бөлім арқылы жұмыс кеңістігі картасында көрсетілетін суретті таңдап, басқа баптауларды өзгертпей оның визуалдық көрінісін жаңарта аласыз.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете, где настраиваются базовые параметры рабочего пространства. Следующий шаг - сохранить изменения или перейти в другие разделы workspace.',
          en: 'You now know where the core workspace settings live. Next you can save your changes or move to other workspace sections.',
          kk: 'Енді жұмыс кеңістігінің негізгі баптаулары қай жерде орналасқанын білесіз. Келесі қадам - өзгерістерді сақтау немесе workspace-тің басқа бөлімдеріне өту.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default settingsTourContent;
