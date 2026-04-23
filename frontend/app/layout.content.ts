import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'layout',
  content: {
    title: t({
      ru: 'Lumio — Обработка банковских выписок',
      en: 'Lumio — Bank statement processing',
      kk: 'Lumio — Банктік үзінділерді өңдеу',
      de: 'Lumio — Kontoauszugsverarbeitung',
      fr: 'Lumio — Traitement des relevés bancaires',
      es: 'Lumio — Procesamiento de extractos bancarios',
      pt: 'Lumio — Processamento de extratos bancários',
      tr: 'Lumio — Banka ekstresi işleme',
      uk: 'Lumio — Обробка банківських виписок',
      zh: 'Lumio — 银行对账单处理',
      ar: 'Lumio — معالجة كشوف الحسابات البنكية',
      pl: 'Lumio — Przetwarzanie wyciągów bankowych',
      it: 'Lumio — Elaborazione degli estratti conto bancari',
    }),
    description: t({
      ru: 'Система автоматической обработки банковских выписок',
      en: 'Automatic bank statement processing system',
      kk: 'Банктік үзінділерді автоматты өңдеу жүйесі',
      de: 'System zur automatischen Verarbeitung von Kontoauszügen',
      fr: 'Système de traitement automatique des relevés bancaires',
      es: 'Sistema de procesamiento automático de extractos bancarios',
      pt: 'Sistema de processamento automático de extratos bancários',
      tr: 'Otomatik banka ekstresi işleme sistemi',
      uk: 'Система автоматичної обробки банківських виписок',
      zh: '自动银行对账单处理系统',
      ar: 'نظام معالجة كشوف الحسابات البنكية تلقائياً',
      pl: 'System automatycznego przetwarzania wyciągów bankowych',
      it: 'Sistema di elaborazione automatica degli estratti conto bancari',
    }),
  },
} satisfies Dictionary;

export default content;
