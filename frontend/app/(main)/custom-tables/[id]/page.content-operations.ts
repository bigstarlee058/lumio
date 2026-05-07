import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTableDetailPageOperations',
  content: {
    paste: {
      titlePrefix: t({ ru: 'Вставка ', en: 'Paste ', kk: 'Қою ' }),
      titleSuffix: t({ ru: ' строк', en: ' rows', kk: ' жол' }),
      titleFallback: t({ ru: 'Вставка строк', en: 'Paste rows', kk: 'Жолдарды қою' }),
      headersToggle: t({
        ru: 'Первая строка — заголовки',
        en: 'First row is headers',
        kk: 'Бірінші жол — тақырыптар',
      }),
      parsing: t({
        ru: 'Подготовка превью...',
        en: 'Preparing preview...',
        kk: 'Алдын ала көру дайындалуда...',
      }),
      add: t({ ru: 'Добавить', en: 'Add', kk: 'Қосу' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      noRows: t({ ru: 'Нет строк для вставки', en: 'No rows to insert', kk: 'Қоюға жол жоқ' }),
      errorsTitle: t({ ru: 'Есть ошибки', en: 'Errors found', kk: 'Қателер бар' }),
      errors: {
        date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
        amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
        currency: t({ ru: 'Валюта', en: 'Currency', kk: 'Валюта' }),
        paid: t({ ru: 'Paid', en: 'Paid', kk: 'Төленді' }),
      },
      addedPrefix: t({ ru: 'Добавлено ', en: 'Added ', kk: 'Қосылды ' }),
      addedSuffix: t({ ru: ' строк', en: ' rows', kk: ' жол' }),
      undo: t({ ru: 'Отменить', en: 'Undo', kk: 'Болдырмау' }),
      insertFailed: t({
        ru: 'Не удалось добавить строки',
        en: 'Failed to add rows',
        kk: 'Жолдарды қосу мүмкін болмады',
      }),
      undoFailed: t({
        ru: 'Не удалось отменить вставку',
        en: 'Failed to undo insert',
        kk: 'Қоюды болдырмау мүмкін болмады',
      }),
      moreRowsPrefix: t({ ru: 'И ещё ', en: 'And ', kk: 'Тағы ' }),
      moreRowsSuffix: t({ ru: ' строк', en: ' more rows', kk: ' жол' }),
      mappingTitle: t({
        ru: 'Сопоставление колонок',
        en: 'Column mapping',
        kk: 'Бағандарды сәйкестендіру',
      }),
      mappingIgnore: t({ ru: 'Не импортировать', en: 'Ignore', kk: 'Импорттамау' }),
      mappingNew: t({ ru: 'Новая колонка', en: 'New column', kk: 'Жаңа баған' }),
      mappingNewPlaceholder: t({ ru: 'Название колонки', en: 'Column name', kk: 'Баған атауы' }),
      missingColumnTitle: t({
        ru: 'Укажите название новой колонки',
        en: 'Provide a name for the new column',
        kk: 'Жаңа баған атауын енгізіңіз',
      }),
      mappingTypeLabel: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      defaults: {
        date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
        type: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
        amount: t({ ru: 'Сумма', en: 'Amount', kk: 'Сома' }),
        currency: t({ ru: 'Валюта', en: 'Currency', kk: 'Валюта' }),
        comment: t({ ru: 'Комментарий', en: 'Comment', kk: 'Түсініктеме' }),
        paid: t({ ru: 'Оплачено', en: 'Paid', kk: 'Төленді' }),
        columnPrefix: t({ ru: 'Колонка', en: 'Column', kk: 'Баған' }),
      },
    },
    addRow: {
      loading: t({ ru: 'Добавление строки...', en: 'Adding row...', kk: 'Жол қосылуда...' }),
      success: t({ ru: 'Строка добавлена', en: 'Row added', kk: 'Жол қосылды' }),
      failed: t({
        ru: 'Не удалось добавить строку',
        en: 'Failed to add row',
        kk: 'Жол қосу мүмкін болмады',
      }),
    },
  },
} satisfies Dictionary;

export default content;
