/**
 * Content для тура по странице выписок
 */

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statements-tour',
  content: {
    name: t({
      ru: 'Тур по выпискам',
      en: 'Statements Tour',
      kk: 'Үзінділер турі',
    }),
    description: t({
      ru: 'Узнайте как загружать и управлять банковскими выписками',
      en: 'Learn how to upload and manage bank statements',
      kk: 'Банк үзінділерін жүктеу және басқару туралы біліңіз',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в Выписки',
          en: 'Welcome to Statements',
          kk: 'Үзінділерге қош келдіңіз',
        }),
        description: t({
          ru: 'На этой странице вы загружаете документы, находите нужные выписки и переходите к их разбору. Коротко пройдемся по текущему интерфейсу.',
          en: 'This page is where you upload documents, find the right statements, and jump into review. Let\'s walk through the current workflow.',
          kk: 'Бұл бетте құжаттарды жүктеп, керек үзінділерді тауып, оларды тексеруге өте аласыз. Қазіргі жұмыс ағынын қысқаша қарап шығайық.',
        }),
      },
      uploadTrigger: {
        title: t({
          ru: 'Загрузка и сканирование',
          en: 'Upload and Scan',
          kk: 'Жүктеу және сканерлеу',
        }),
        description: t({
          ru: 'Эта кнопка запускает самый быстрый путь добавления новых документов: скан, локальная загрузка, Gmail и облачные источники.',
          en: 'This trigger opens the fastest path for adding new documents: scan, local upload, Gmail, and connected cloud sources.',
          kk: 'Бұл батырма жаңа құжаттарды қосудың ең жылдам жолын ашады: скан, жергілікті жүктеу, Gmail және бұлттық көздер.',
        }),
      },
      searchBar: {
        title: t({
          ru: 'Поиск по списку',
          en: 'Search the List',
          kk: 'Тізімнен іздеу',
        }),
        description: t({
          ru: 'Поиск помогает быстро сузить список по названию файла, теме письма, отправителю или продавцу.',
          en: 'Search quickly narrows the list by file name, email subject, sender, or merchant.',
          kk: 'Іздеу тізімді файл атауы, хат тақырыбы, жіберуші немесе сатушы бойынша тез тарылтады.',
        }),
      },
      filters: {
        title: t({
          ru: 'Фильтры',
          en: 'Filters',
          kk: 'Сүзгілер',
        }),
        description: t({
          ru: 'Здесь собраны быстрые фильтры и доступ к расширенной панели, чтобы оставить в списке только нужные документы.',
          en: 'This area groups the quick filters and the advanced panel so you can keep only the documents you need in view.',
          kk: 'Бұл аймақта жылдам сүзгілер мен кеңейтілген панель бар, сондықтан тізімде тек керек құжаттарды қалдыра аласыз.',
        }),
      },
      statementsList: {
        title: t({
          ru: 'Список выписок',
          en: 'Statements List',
          kk: 'Үзінділер тізімі',
        }),
        description: t({
          ru: 'Основная область показывает найденные документы, их даты, суммы и доступные действия без перехода в другие разделы.',
          en: 'The main list shows the matched documents, their dates, amounts, and the actions available without leaving the page.',
          kk: 'Негізгі тізімде табылған құжаттар, олардың күндері, сомалары және беттен шықпай қолжетімді әрекеттер көрсетіледі.',
        }),
      },
      statementRow: {
        title: t({
          ru: 'Карточка выписки',
          en: 'Statement Row',
          kk: 'Үзінді жолы',
        }),
        description: t({
          ru: 'Каждая строка показывает ключевые данные по документу: источник, дату, сумму и текущее состояние обработки. Это хороший ориентир для проверки списка перед следующими действиями.',
          en: 'Each row surfaces the key document details: source, date, amount, and current processing state. It is the best place to quickly validate what is in the list before moving on.',
          kk: 'Әр жол құжаттың негізгі деректерін көрсетеді: көзі, күні, сомасы және өңдеу күйі. Бұл келесі әрекетке өтпес бұрын тізімді жылдам тексерудің ең ыңғайлы жері.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All Set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь тур отражает текущую страницу выписок. Можно загрузить новый документ или открыть любую строку для продолжения.',
          en: 'The tour now matches the current Statements page. You can upload a new document or open any row to continue.',
          kk: 'Бұл тур енді қазіргі Үзінділер бетіне сай келеді. Енді жаңа құжат жүктеп немесе кез келген жолды ашып жалғастыра аласыз.',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;
