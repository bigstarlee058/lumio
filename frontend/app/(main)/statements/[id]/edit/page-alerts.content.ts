import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statementEditPageAlerts',
  content: {
    alertNeedsFixTitle: t({
      ru: 'Нужно исправить перед отправкой',
      en: 'Fix required before submit',
      kk: 'Жіберу алдында түзету қажет',
    }),
    alertReviewTitle: t({
      ru: 'Проверьте выписку перед отправкой',
      en: 'Review statement before submit',
      kk: 'Жіберу алдында үзіндіні тексеріңіз',
    }),
    alertReadyTitle: t({
      ru: 'Выписка готова к отправке',
      en: 'Statement is ready to submit',
      kk: 'Үзінді жіберуге дайын',
    }),
    alertReadyBody: t({
      ru: 'Все обязательные категории назначены. Данные выглядят корректно, можно отправлять.',
      en: 'All required categories are assigned. The data looks good and ready to submit.',
      kk: 'Барлық міндетті санаттар тағайындалды. Деректер дұрыс, жіберуге болады.',
    }),
    alertStatementCategoryMissing: t({
      ru: 'Не выбрана категория выписки.',
      en: 'Statement category is not selected.',
      kk: 'Үзінді санаты таңдалмаған.',
    }),
    alertStatementCategoryDisabled: t({
      ru: 'Выбранная категория выписки отключена. Выберите активную.',
      en: 'Selected statement category is disabled. Choose an active category.',
      kk: 'Таңдалған үзінді санаты өшірілген. Белсенді санатты таңдаңыз.',
    }),
    alertTransactionsCategoryMissing: t({
      ru: '{count} транзакций требуют категорию. Назначьте категории для всех строк.',
      en: '{count} transactions require a category. Assign categories for all rows.',
      kk: '{count} транзакцияға санат қажет. Барлық жолдарға санат тағайындаңыз.',
    }),
    alertParsingErrors: t({
      ru: 'Обнаружено {count} ошибок парсинга. Проверьте детали и данные выписки.',
      en: '{count} parsing errors found. Review parsing details and statement data.',
      kk: '{count} парсинг қатесі анықталды. Толық мәліметтерді тексеріңіз.',
    }),
    alertParsingWarnings: t({
      ru: 'Есть {count} предупреждений парсинга. Рекомендуется проверить спорные строки.',
      en: '{count} parsing warnings found. It is recommended to review flagged rows.',
      kk: '{count} парсинг ескертуі бар. Белгіленген жолдарды тексеріңіз.',
    }),
    alertNoTransactions: t({
      ru: 'В выписке нет транзакций. Проверьте файл или параметры импорта.',
      en: 'No transactions found in this statement. Check file or import settings.',
      kk: 'Үзіндіде транзакциялар жоқ. Файлды не импорт баптауларын тексеріңіз.',
    }),
  },
} satisfies Dictionary;

export default content;
