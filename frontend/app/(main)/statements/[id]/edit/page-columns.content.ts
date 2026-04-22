import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'statementEditPageColumns',
  content: {
    date: t({ ru: 'Дата', en: 'Date', kk: 'Күні' }),
    counterparty: t({ ru: 'Контрагент', en: 'Counterparty', kk: 'Контрагент' }),
    paymentPurposeShort: t({ ru: 'Назначение платежа', en: 'Payment purpose', kk: 'Төлем мақсаты' }),
    expense: t({ ru: 'Расход', en: 'Expense', kk: 'Шығыс' }),
    income: t({ ru: 'Доход', en: 'Income', kk: 'Кіріс' }),
    category: t({ ru: 'Категория', en: 'Category', kk: 'Санат' }),
    actions: t({ ru: 'Действия', en: 'Actions', kk: 'Әрекеттер' }),
    transactionDate: t({ ru: 'Дата операции', en: 'Transaction date', kk: 'Операция күні' }),
    documentNumber: t({ ru: 'Номер документа', en: 'Document number', kk: 'Құжат нөмірі' }),
    counterpartyName: t({
      ru: 'Наименование контрагента',
      en: 'Counterparty name',
      kk: 'Контрагент атауы',
    }),
    counterpartyBin: t({
      ru: 'БИН/номер счёта контрагента',
      en: 'Counterparty BIN/account',
      kk: 'Контрагент БСН/есепшот',
    }),
    counterpartyBank: t({
      ru: 'Реквизиты банка контрагента',
      en: 'Counterparty bank details',
      kk: 'Контрагент банк реквизиттері',
    }),
    debit: t({ ru: 'Дебет', en: 'Debit', kk: 'Дебет' }),
    credit: t({ ru: 'Кредит', en: 'Credit', kk: 'Кредит' }),
    paymentPurpose: t({ ru: 'Назначение платежа', en: 'Payment purpose', kk: 'Төлем мақсаты' }),
    categoryId: t({ ru: 'Категория', en: 'Category', kk: 'Санат' }),
    branchId: t({ ru: 'Филиал', en: 'Branch', kk: 'Филиал' }),
    walletId: t({ ru: 'Кошелек', en: 'Wallet', kk: 'Әмиян' }),
  },
} satisfies Dictionary;

export default content;
