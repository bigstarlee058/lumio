import { type DeclarationContent, t } from 'intlayer';

const categoriesTourContent = {
  key: 'categories-tour-content',
  content: {
    name: t({
      ru: 'Тур по категориям',
      en: 'Categories Tour',
      kk: 'Санаттар туры',
    }),
    description: t({
      ru: 'Управление рабочими категориями',
      en: 'Manage workspace categories',
      kk: 'Жұмыс кеңістігі санаттарын басқару',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в категории',
          en: 'Welcome to Categories',
          kk: 'Санаттарға қош келдіңіз',
        }),
        description: t({
          ru: 'На этой странице вы управляете категориями рабочего пространства: создаете новые, ищете существующие и включаете или отключаете их для использования в системе.',
          en: 'This page is where you manage workspace categories: create new ones, search existing ones, and enable or disable them for use across the product.',
          kk: 'Бұл бетте жұмыс кеңістігі санаттарын басқарасыз: жаңаларын жасайсыз, барларын іздейсіз және жүйеде қолдану үшін қосып не өшіресіз.',
        }),
      },
      addButton: {
        title: t({
          ru: 'Добавить категорию',
          en: 'Add category',
          kk: 'Санат қосу',
        }),
        description: t({
          ru: 'Эта кнопка открывает форму создания категории. Используйте ее, когда нужно добавить новый способ группировки транзакций, файлов или данных.',
          en: 'This button opens the category creation form. Use it when you need a new way to group transactions, files, or related data.',
          kk: 'Бұл батырма санат жасау формасын ашады. Оны транзакцияларды, файлдарды немесе байланысты деректерді жаңа түрде топтау қажет болғанда пайдаланыңыз.',
        }),
      },
      search: {
        title: t({
          ru: 'Поиск категории',
          en: 'Search categories',
          kk: 'Санаттарды іздеу',
        }),
        description: t({
          ru: 'Поиск помогает быстро находить нужные категории по названию, особенно если список уже большой и включает системные и пользовательские элементы.',
          en: 'Search helps you quickly locate a category by name, especially once the list grows to include both system and custom entries.',
          kk: 'Іздеу санатты атауы бойынша тез табуға көмектеседі, әсіресе тізімде жүйелік те, қолданушы жасаған элементтер де көп болғанда.',
        }),
      },
      categoriesList: {
        title: t({
          ru: 'Список категорий',
          en: 'Categories list',
          kk: 'Санаттар тізімі',
        }),
        description: t({
          ru: 'Здесь показаны все категории с их названием, статусом использования и служебными метками. Это основная область для обзора и управления списком.',
          en: 'This list shows every category with its name, usage state, and system badges. It is the main area for reviewing and managing the full set.',
          kk: 'Мұнда әр санат атауымен, қолданылу күйімен және жүйелік белгілерімен бірге көрсетіледі. Бұл толық тізімді қарап, басқаруға арналған негізгі аймақ.',
        }),
      },
      categoryToggle: {
        title: t({
          ru: 'Включение и отключение',
          en: 'Enable or disable',
          kk: 'Қосу немесе өшіру',
        }),
        description: t({
          ru: 'Переключатель управляет доступностью категории в интерфейсах выписок и отчетов. Если конкретной строки нет, тур пропустит этот шаг без ошибки.',
          en: 'This toggle controls whether a category stays available in statements and reporting flows. If no category row is currently visible, the tour skips this step safely.',
          kk: 'Бұл ауыстырғыш санаттың үзінділер мен есептер интерфейсінде қолжетімді болуын басқарады. Егер тиісті жол қазір көрінбесе, тур бұл қадамды қате шығармай өткізіп жібереді.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь вы знаете, где создавать, искать и переключать категории рабочего пространства. Дальше можно открыть нужную категорию и настроить ее подробнее.',
          en: 'You now know where to create, find, and toggle workspace categories. From here you can open the right category and refine it further.',
          kk: 'Енді жұмыс кеңістігі санаттарын қайдан жасау, табу және ауыстыру керегін білесіз. Келесі қадамда қажетті санатты ашып, оны тереңірек баптай аласыз.',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default categoriesTourContent;
