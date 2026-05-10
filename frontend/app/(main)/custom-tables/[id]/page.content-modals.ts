import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'customTableDetailPageModals',
  content: {
    renameColumn: {
      success: t({
        ru: 'Название колонки обновлено',
        en: 'Column renamed',
        kk: 'Баған атауы жаңартылды',
      }),
      failed: t({
        ru: 'Не удалось переименовать колонку',
        en: 'Failed to rename column',
        kk: 'Баған атын өзгерту мүмкін болмады',
      }),
    },
    deleteColumn: {
      loading: t({ ru: 'Удаление колонки...', en: 'Deleting column...', kk: 'Баған жойылуда...' }),
      success: t({ ru: 'Колонка удалена', en: 'Column deleted', kk: 'Баған жойылды' }),
      failed: t({
        ru: 'Не удалось удалить колонку',
        en: 'Failed to delete column',
        kk: 'Бағанды жою мүмкін болмады',
      }),
      confirmTitle: t({
        ru: 'Удалить колонку?',
        en: 'Delete column?',
        kk: 'Бағанды жою керек пе?',
      }),
      confirmWithNamePrefix: t({ ru: 'Колонка "', en: 'Column "', kk: 'Баған "' }),
      confirmWithNameSuffix: t({
        ru: '" будет удалена. Значения в строках останутся в данных, но не будут отображаться (пока не добавите колонку снова).',
        en: '" will be deleted. Values will remain in data but won\'t be shown (until you add the column again).',
        kk: '" жойылады. Мәндер деректе қалады, бірақ көрсетілмейді (бағанды қайта қоспайынша).',
      }),
      confirmNoName: t({
        ru: 'Колонка будет удалена.',
        en: 'Column will be deleted.',
        kk: 'Баған жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    deleteRow: {
      loading: t({ ru: 'Удаление строки...', en: 'Deleting row...', kk: 'Жол жойылуда...' }),
      success: t({ ru: 'Строка удалена', en: 'Row deleted', kk: 'Жол жойылды' }),
      failed: t({
        ru: 'Не удалось удалить строку',
        en: 'Failed to delete row',
        kk: 'Жолды жою мүмкін болмады',
      }),
      confirmTitle: t({ ru: 'Удалить строку?', en: 'Delete row?', kk: 'Жолды жою керек пе?' }),
      confirmWithNumberPrefix: t({ ru: 'Строка #', en: 'Row #', kk: 'Жол #' }),
      confirmWithNumberSuffix: t({
        ru: ' будет удалена.',
        en: ' will be deleted.',
        kk: ' жойылады.',
      }),
      confirmNoNumber: t({
        ru: 'Строка будет удалена.',
        en: 'Row will be deleted.',
        kk: 'Жол жойылады.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    bulkDeleteRows: {
      loading: t({ ru: 'Удаление строк...', en: 'Deleting rows...', kk: 'Жолдар жойылуда...' }),
      success: t({ ru: 'Строки удалены', en: 'Rows deleted', kk: 'Жолдар жойылды' }),
      failed: t({
        ru: 'Не удалось удалить некоторые строки',
        en: 'Failed to delete some rows',
        kk: 'Кейбір жолдарды жою мүмкін болмады',
      }),
      confirmTitle: t({ ru: 'Удалить строки?', en: 'Delete rows?', kk: 'Жолдарды жою керек пе?' }),
      confirmMessagePrefix: t({ ru: 'Будут удалены ', en: 'Delete ', kk: 'Жойылады ' }),
      confirmMessageSuffix: t({
        ru: ' выбранных строк.',
        en: ' selected rows?',
        kk: ' таңдалған жол.',
      }),
      confirm: t({ ru: 'Удалить', en: 'Delete', kk: 'Жою' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
    },
    columnIcon: {
      uploaded: t({ ru: 'Иконка загружена', en: 'Icon uploaded', kk: 'Иконка жүктелді' }),
      uploadFailed: t({
        ru: 'Не удалось загрузить иконку',
        en: 'Failed to upload icon',
        kk: 'Иконканы жүктеу мүмкін болмады',
      }),
    },
    addColumn: {
      modalTitle: t({ ru: 'Новая колонка', en: 'New column', kk: 'Жаңа баған' }),
      loading: t({ ru: 'Добавление колонки...', en: 'Adding column...', kk: 'Баған қосылуда...' }),
      success: t({ ru: 'Колонка добавлена', en: 'Column added', kk: 'Баған қосылды' }),
      failed: t({
        ru: 'Не удалось добавить колонку',
        en: 'Failed to add column',
        kk: 'Баған қосу мүмкін болмады',
      }),
      titleLabel: t({ ru: 'Название колонки', en: 'Column name', kk: 'Баған атауы' }),
      titlePlaceholder: t({
        ru: 'Например: Сумма, Дата, Контрагент',
        en: 'e.g. Amount, Date, Counterparty',
        kk: 'Мысалы: Сома, Күні, Контрагент',
      }),
      typeLabel: t({ ru: 'Тип', en: 'Type', kk: 'Түрі' }),
      iconLabel: t({ ru: 'Иконка', en: 'Icon', kk: 'Иконка' }),
      choose: t({ ru: 'Выбрать', en: 'Choose', kk: 'Таңдау' }),
      uploadIcon: t({ ru: 'Загрузить иконку', en: 'Upload icon', kk: 'Иконканы жүктеу' }),
      uploading: t({ ru: 'Загрузка...', en: 'Uploading...', kk: 'Жүктелуде...' }),
      cancel: t({ ru: 'Отмена', en: 'Cancel', kk: 'Болдырмау' }),
      save: t({ ru: 'Сохранить', en: 'Save', kk: 'Сақтау' }),
    },
  },
} satisfies Dictionary;

export default content;
