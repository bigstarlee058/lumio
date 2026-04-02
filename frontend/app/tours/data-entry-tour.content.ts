import { type DeclarationContent, t } from 'intlayer';

/**
 * Розширений контент для тура по вводу даних
 */
export const dataEntryTourContent = {
  key: 'data-entry-tour-content',
  content: {
    name: t({
      ru: 'Тур по вводу данных',
      en: 'Data Entry Tour',
      kk: 'Деректерді енгізу туры',
    }),
    description: t({
      ru: 'Проверка и редактирование транзакций',
      en: 'Review and edit transactions',
      kk: 'Транзакцияларды тексеру және өңдеу',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Добро пожаловать в ввод данных',
          en: 'Welcome to Data Entry',
          kk: 'Деректерді енгізуге қош келдіңіз',
        }),
        description: t({
          ru: 'Здесь вы можете вести учёт остатков наличных, сырья и движений по дебету/кредиту. Фиксируйте остатки на конкретные даты, добавляйте комментарии и ведите детальный учёт в разных валютах. Давайте разберемся во всех возможностях!',
          en: "Here you can keep track of cash balances, raw materials, and debit/credit movements. Record balances on specific dates, add comments, and maintain detailed records in different currencies. Let's explore all the features!",
          kk: 'Мұнда сіз қолма-қол ақшаның қалдықтарын, шикізатты және дебет/кредит қозғалыстарын қадағалай аласыз. Нақты күндердегі қалдықтарды тіркеңіз, түсініктемелер қосыңыз және әртүрлі валюталарда егжей-тегжейлі есепті жүргізіңіз. Барлық мүмкіндіктерді зерттейік!',
        }),
      },
      tabs: {
        title: t({
          ru: 'Вкладки типов данных',
          en: 'Data Type Tabs',
          kk: 'Деректер түрлерінің қойындылары',
        }),
        description: t({
          ru: 'Четыре основные вкладки позволяют вести учёт разных типов данных: Наличные — остатки наличных средств, Сырьё — складские запасы, Дебет — поступления, Кредит — отгрузки. Переключайтесь между вкладками для работы с разными категориями.',
          en: 'Four main tabs allow you to track different data types: Cash — cash balances, Raw — inventory, Debit — receipts, Credit — shipments. Switch between tabs to work with different categories.',
          kk: 'Төрт негізгі қойынды әртүрлі деректер түрлерін қадағалауға мүмкіндік береді: Қолма-қол ақша — қолма-қол ақша қалдықтары, Шикізат — қойма қорлары, Дебет — түсімдер, Кредит — жөнелтулер. Әртүрлі санаттармен жұмыс істеу үшін қойындылар арасында ауысыңыз.',
        }),
      },
      tabsInfo: {
        title: t({
          ru: 'Дополнительная вкладка',
          en: 'Custom Tab',
          kk: 'Қосымша қойынды',
        }),
        description: t({
          ru: "Вкладка '+ Пользовательская' позволяет создавать свои собственные типы данных с уникальными названиями и иконками. Например, 'Склад №2', 'Поставщик Х' или любые другие категории для вашей специфики учёта.",
          en: "The '+ Custom' tab lets you create your own data types with unique names and icons. For example, 'Warehouse #2', 'Supplier X', or any other categories for your specific accounting needs.",
          kk: "'+ Пайдаланушы' қойындысы өзіңіздің бірегей аттары мен белгішелері бар деректер түрлерін жасауға мүмкіндік береді. Мысалы, 'Қойма №2', 'Жеткізуші Х' немесе есепке алудың өзіндік ерекшеліктері үшін кез келген басқа санаттар.",
        }),
      },
      editColumnsButton: {
        title: t({
          ru: 'Редактировать (колонки)',
          en: 'Edit (Columns)',
          kk: 'Өңдеу (Бағандар)',
        }),
        description: t({
          ru: 'Кнопка «Редактировать» включает панель настройки колонок пользовательской вкладки (название и иконка). Она активна только для вкладок, которые вы создали сами.',
          en: 'The “Edit” button opens the column settings panel for a custom tab (name and icon). It is enabled only for tabs you created.',
          kk: '«Өңдеу» батырмасы пайдаланушы қойындысының баптауларын (атауы мен белгішесі) ашуға мүмкіндік береді. Ол тек өзіңіз жасаған қойындыларда белсенді.',
        }),
      },
      tableActionsButton: {
        title: t({
          ru: 'Действия с таблицами',
          en: 'Table Actions',
          kk: 'Кестелер әрекеттері',
        }),
        description: t({
          ru: 'Нажмите «Действия с таблицами», чтобы открыть меню. Дальше разберём каждый пункт и что он делает.',
          en: 'Click “Table Actions” to open the menu. Next, we’ll go through each option and what it does.',
          kk: 'Мәзірді ашу үшін «Кестелер әрекеттері» батырмасын басыңыз. Келесі қадамдарда әр опцияны түсіндіреміз.',
        }),
      },
      tableActionsCreateForTab: {
        title: t({
          ru: 'Создать таблицу по текущей вкладке',
          en: 'Create Table for Current Tab',
          kk: 'Ағымдағы қойынды бойынша кесте жасау',
        }),
        description: t({
          ru: 'Создаёт таблицу на основе текущей вкладки (например «Наличные» или ваша пользовательская вкладка) и переносит туда данные.',
          en: 'Creates a table based on the current tab (e.g., “Cash” or your custom tab) and fills it with the data.',
          kk: 'Ағымдағы қойынды негізінде (мысалы, «Қолма-қол ақша» немесе сіздің қойындыңыз) кесте жасап, деректерді соған толтырады.',
        }),
      },
      tableActionsCreateSingle: {
        title: t({
          ru: 'Создать единую таблицу',
          en: 'Create One Combined Table',
          kk: 'Біріккен кесте жасау',
        }),
        description: t({
          ru: 'Создаёт одну общую таблицу со всеми типами данных сразу — удобно, если хотите анализировать всё в одном месте.',
          en: 'Creates one combined table with all data types at once — useful if you want to analyze everything in one place.',
          kk: 'Барлық деректер түрлерін бір кестеге біріктіріп жасайды — бәрін бір жерден талдауға ыңғайлы.',
        }),
      },
      tableActionsSyncLinked: {
        title: t({
          ru: 'Синхронизация с привязанной таблицей',
          en: 'Sync with Linked Table',
          kk: 'Байланыстырылған кестемен синхрондау',
        }),
        description: t({
          ru: 'Если вкладка уже связана с таблицей, здесь появится действие синхронизации — оно обновит данные в связанной таблице.',
          en: 'If this tab is already linked to a table, you’ll see a sync option here — it updates data in the linked table.',
          kk: 'Егер қойынды кестемен байланыстырылған болса, мұнда синхрондау әрекеті пайда болады — ол байланыстырылған кестедегі деректерді жаңартады.',
        }),
      },
      dateField: {
        title: t({
          ru: 'Выбор даты',
          en: 'Date Selection',
          kk: 'Күнді таңдау',
        }),
        description: t({
          ru: 'Укажите дату, на которую фиксируете остаток или движение. Кликните по полю, чтобы открыть календарь для удобного выбора. Можно вести учёт за любой период — прошлый, текущий или будущий.',
          en: "Specify the date for which you're recording the balance or movement. Click the field to open a calendar for convenient selection. You can track any period — past, current, or future.",
          kk: 'Қалдықты немесе қозғалысты тіркейтін күнді көрсетіңіз. Ыңғайлы таңдау үшін күнтізбені ашу үшін өріске басыңыз. Кез келген кезеңді қадағалай аласыз — өткен, ағымдағы немесе болашақ.',
        }),
      },
      amountField: {
        title: t({
          ru: 'Сумма',
          en: 'Amount',
          kk: 'Сома',
        }),
        description: t({
          ru: 'Введите числовое значение остатка или движения. Можно использовать десятичные дроби (например, 1250.50). Значение сохранится в выбранной валюте и будет отображаться в списке записей с указанием даты.',
          en: 'Enter the numeric value of the balance or movement. You can use decimal numbers (e.g., 1250.50). The value will be saved in the selected currency and displayed in the records list with the date.',
          kk: 'Қалдықтың немесе қозғалыстың сандық мәнін енгізіңіз. Ондық бөлшектерді пайдалана аласыз (мысалы, 1250.50). Мән таңдалған валютада сақталады және күні көрсетілген жазбалар тізімінде көрсетіледі.',
        }),
      },
      noteField: {
        title: t({
          ru: 'Комментарий',
          en: 'Comment',
          kk: 'Түсініктеме',
        }),
        description: t({
          ru: 'Добавьте пояснение к записи: откуда поступили средства, для чего используется остаток, номер накладной, склад и любую другую информацию для удобства. Комментарии помогут быстро найти нужную запись через поиск.',
          en: 'Add an explanation to the entry: where the funds came from, what the balance is used for, invoice number, warehouse, and any other information for convenience. Comments will help quickly find the needed entry through search.',
          kk: 'Жазбаға түсініктеме қосыңыз: қаражат қайдан түсті, қалдық не үшін пайдаланылады, шот-фактура нөмірі, қойма және ыңғайлылық үшін кез келген басқа ақпарат. Түсініктемелер іздеу арқылы қажетті жазбаны жылдам табуға көмектеседі.',
        }),
      },
      currencyField: {
        title: t({
          ru: 'Валюта',
          en: 'Currency',
          kk: 'Валюта',
        }),
        description: t({
          ru: 'Выберите валюту для записи из выпадающего списка: KZT (тенге), USD (доллар), EUR (евро) или RUB (рубль). Каждая запись сохраняется в своей валюте, что позволяет вести мультивалютный учёт.',
          en: 'Select the currency for the entry from the dropdown: KZT (tenge), USD (dollar), EUR (euro), or RUB (ruble). Each entry is saved in its own currency, allowing for multi-currency accounting.',
          kk: 'Жазба үшін валютаны ашылмалы тізімнен таңдаңыз: KZT (теңге), USD (доллар), EUR (евро) немесе RUB (рубль). Әрбір жазба өз валютасында сақталады, бұл көпвалюталық есепке алуға мүмкіндік береді.',
        }),
      },
      saveButton: {
        title: t({
          ru: 'Сохранение записи',
          en: 'Save Entry',
          kk: 'Жазбаны сақтау',
        }),
        description: t({
          ru: "Нажмите кнопку 'Сохранить запись', чтобы добавить данные в базу. Запись появится в списке ниже с указанием даты и суммы. После сохранения форма автоматически очистится для добавления следующей записи.",
          en: "Click the 'Save Entry' button to add data to the database. The entry will appear in the list below with the date and amount. After saving, the form will automatically clear for adding the next entry.",
          kk: "Деректерді дерекқорға қосу үшін 'Жазбаны сақтау' батырмасын басыңыз. Жазба төмендегі тізімде күні мен сомасы көрсетілген түрде пайда болады. Сақтағаннан кейін пішін келесі жазбаны қосу үшін автоматты түрде тазартылады.",
        }),
      },
      entriesList: {
        title: t({
          ru: 'Список последних записей',
          en: 'Recent Entries List',
          kk: 'Соңғы жазбалар тізімі',
        }),
        description: t({
          ru: 'Здесь отображаются все сохранённые записи для текущей вкладки: дата, сумма с валютой и комментарий. Записи отсортированы по дате — от новых к старым. Для каждой записи доступно редактирование и удаление.',
          en: 'All saved entries for the current tab are displayed here: date, amount with currency, and comment. Entries are sorted by date — from newest to oldest. Each entry can be edited or deleted.',
          kk: 'Мұнда ағымдағы қойынды үшін барлық сақталған жазбалар көрсетіледі: күні, валютамен сомасы және түсініктеме. Жазбалар күні бойынша сұрыпталған — жаңадан ескіге дейін. Әрбір жазбаны өңдеуге немесе жоюға болады.',
        }),
      },
      searchEntries: {
        title: t({
          ru: 'Поиск записей',
          en: 'Search Entries',
          kk: 'Жазбаларды іздеу',
        }),
        description: t({
          ru: 'Используйте поле поиска для быстрого нахождения записей по комментарию, сумме или любому тексту. Поиск работает мгновенно — начните вводить, и список автоматически отфильтруется. Нажмите крестик для очистки поиска.',
          en: 'Use the search field to quickly find entries by comment, amount, or any text. Search works instantly — start typing and the list will automatically filter. Click the X to clear the search.',
          kk: 'Жазбаларды түсініктеме, сома немесе кез келген мәтін бойынша жылдам табу үшін іздеу өрісін пайдаланыңыз. Іздеу лезде жұмыс істейді — теруді бастаңыз және тізім автоматты түрде сүзіледі. Іздеуді тазарту үшін X белгісін басыңыз.',
        }),
      },
      dateFilter: {
        title: t({
          ru: 'Фильтр по дате',
          en: 'Date Filter',
          kk: 'Күн бойынша сүзгі',
        }),
        description: t({
          ru: 'Выберите конкретную дату из календаря, чтобы отобразить только записи за этот день. Это помогает быстро найти остатки или движения на определённую дату. Нажмите крестик, чтобы сбросить фильтр и показать все записи.',
          en: 'Select a specific date from the calendar to display only entries for that day. This helps quickly find balances or movements for a specific date. Click the X to reset the filter and show all entries.',
          kk: 'Тек сол күнге арналған жазбаларды көрсету үшін күнтізбеден нақты күнді таңдаңыз. Бұл нақты күнге арналған қалдықтарды немесе қозғалыстарды жылдам табуға көмектеседі. Сүзгіні қалпына келтіру және барлық жазбаларды көрсету үшін X белгісін басыңыз.',
        }),
      },
      customTab: {
        title: t({
          ru: 'Пользовательские типы данных',
          en: 'Custom Data Types',
          kk: 'Пайдаланушы деректер түрлері',
        }),
        description: t({
          ru: "На вкладке '+ Пользовательская' вы можете создать свои собственные типы записей с уникальными названиями и иконками. Введите название (например, 'Склад №2'), выберите иконку и нажмите 'Создать'. Новая вкладка появится в списке, и вы сможете вести в ней отдельный учёт. Это позволяет гибко настроить систему под любую структуру бизнеса!",
          en: "On the '+ Custom' tab, you can create your own entry types with unique names and icons. Enter a name (e.g., 'Warehouse #2'), select an icon, and click 'Create'. A new tab will appear in the list, and you can maintain separate records in it. This allows you to flexibly configure the system for any business structure!",
          kk: "'+ Пайдаланушы' қойындысында сіз бірегей аттары мен белгішелері бар өз жазбалар түрлерін жасай аласыз. Атауын енгізіңіз (мысалы, 'Қойма №2'), белгішені таңдаңыз және 'Жасау' батырмасын басыңыз. Жаңа қойынды тізімде пайда болады және сіз онда бөлек жазбаларды жүргізе аласыз. Бұл жүйені кез келген бизнес құрылымына икемді түрде теңшеуге мүмкіндік береді!",
        }),
      },
      completed: {
        title: t({
          ru: 'Отлично!',
          en: 'Great!',
          kk: 'Тамаша!',
        }),
        description: t({
          ru: 'Теперь вы знаете, как работать с вводом данных. Фиксируйте остатки наличных, сырья, дебет и кредит, создавайте свои типы записей и ведите детальный учёт в разных валютах. Используйте поиск и фильтры для быстрого доступа к нужной информации!',
          en: 'Now you know how to work with data entry. Record cash balances, raw materials, debit and credit, create your own entry types, and maintain detailed records in different currencies. Use search and filters for quick access to the information you need!',
          kk: 'Енді сіз деректерді енгізумен қалай жұмыс істеуді білесіз. Қолма-қол ақша қалдықтарын, шикізатты, дебет пен кредитті тіркеңіз, өз жазбалар түрлерін жасаңыз және әртүрлі валюталарда егжей-тегжейлі есепті жүргізіңіз. Қажетті ақпаратқа жылдам қол жеткізу үшін іздеу мен сүзгілерді пайдаланыңыз!',
        }),
      },
    },
  },
} satisfies DeclarationContent;

export default dataEntryTourContent;
