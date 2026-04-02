import { type DeclarationContent, t } from 'intlayer';

/**
 * Контент для тура по странице хранилища
 */
export const storageTourContent = {
  key: 'storage-tour-content',
  content: {
    name: t({
      ru: 'Тур по хранилищу',
      en: 'Storage Tour',
      kk: 'Қойма туры',
    }),
    description: t({
      ru: 'Управление файлами и правами доступа',
      en: 'Manage files and access rights',
      kk: 'Файлдар мен қолжетімділік құқықтарын басқару',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в хранилище файлов',
          en: 'Welcome to File Storage',
          kk: 'Файл қоймасына қош келдіңіз',
        }),
        description: t({
          ru: 'Здесь вы можете управлять всеми загруженными банковскими выписками: просматривать, скачивать, делиться и организовывать файлы по категориям. Давайте познакомимся с основными возможностями!',
          en: "Here you can manage all uploaded bank statements: view, download, share, and organize files by categories. Let's explore the main features!",
          kk: 'Мұнда сіз барлық жүктелген банк үзінділерін басқара аласыз: қарау, жүктеп алу, бөлісу және файлдарды санаттар бойынша ұйымдастыру. Негізгі мүмкіндіктермен танысайық!',
        }),
      },
      search: {
        title: t({
          ru: 'Поиск файлов',
          en: 'File Search',
          kk: 'Файлдарды іздеу',
        }),
        description: t({
          ru: 'Используйте поиск для быстрого нахождения нужных файлов по имени. Поиск работает мгновенно и фильтрует результаты в реальном времени.',
          en: 'Use search to quickly find files by name. Search works instantly and filters results in real-time.',
          kk: 'Файлдарды аты бойынша жылдам табу үшін іздеуді пайдаланыңыз. Іздеу лезде жұмыс істейді және нәтижелерді нақты уақытта сүзеді.',
        }),
      },
      filters: {
        title: t({
          ru: 'Фильтры',
          en: 'Filters',
          kk: 'Сүзгілер',
        }),
        description: t({
          ru: 'Используйте фильтры для отбора файлов по статусу, банку или категории. Комбинируйте несколько фильтров для точного поиска нужных документов.',
          en: 'Use filters to select files by status, bank, or category. Combine multiple filters for precise document search.',
          kk: 'Файлдарды күй, банк немесе санат бойынша таңдау үшін сүзгілерді пайдаланыңыз. Қажетті құжаттарды дәл іздеу үшін бірнеше сүзгіні біріктіріңіз.',
        }),
      },
      storageTable: {
        title: t({
          ru: 'Список файлов',
          en: 'Files Table',
          kk: 'Файлдар кестесі',
        }),
        description: t({
          ru: 'Главная таблица показывает все найденные документы: название, банк, размер, статус, категорию, доступ и дату. Это основная рабочая область страницы.',
          en: 'The main table shows every matching document with its name, bank, size, status, category, access, and date. This is the page’s primary working area.',
          kk: 'Негізгі кесте сәйкес келген барлық құжаттарды көрсетеді: атауы, банкі, өлшемі, күйі, санаты, қолжетімділігі және күні. Бұл беттің негізгі жұмыс аймағы.',
        }),
      },
      fileRow: {
        title: t({
          ru: 'Строка файла',
          en: 'File Row',
          kk: 'Файл жолы',
        }),
        description: t({
          ru: 'Одна строка объединяет ключевые детали и быстрые действия: просмотр, скачивание, категорию и работу с файлом без перехода в другие разделы.',
          en: 'A single row combines the key details and the quick actions: preview, download, category assignment, and file work without leaving the page.',
          kk: 'Бір жолда негізгі деректер мен жылдам әрекеттер біріктірілген: алдын ала қарау, жүктеп алу, санат беру және беттен шықпай файлмен жұмыс істеу.',
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично!',
          en: 'Great!',
          kk: 'Тамаша!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как управлять файлами в хранилище. Используйте фильтры и категории для быстрого поиска нужных документов!',
          en: 'Now you know how to manage files in storage. Use filters and categories to quickly find the documents you need!',
          kk: 'Енді сіз қоймадағы файлдарды қалай басқаруды білесіз. Қажетті құжаттарды жылдам табу үшін сүзгілер мен санаттарды пайдаланыңыз!',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default storageTourContent;
