import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'currencyDisplayToggle',
  content: {
    showInCurrency: t({
      ru: 'В валюте',
      en: 'Show in',
      kk: 'Валютада',
      de: 'Anzeigen in',
      fr: 'Afficher en',
      es: 'Mostrar en',
      pt: 'Mostrar em',
      tr: 'Göster:',
      uk: 'У валюті',
      zh: '显示为',
      ar: 'عرض بـ',
      pl: 'Pokaż w',
      it: 'Mostra in',
    }),
    showOriginal: t({
      ru: 'Оригинальные валюты',
      en: 'Original currencies',
      kk: 'Бастапқы валюталар',
      de: 'Originalwährungen',
      fr: 'Devises originales',
      es: 'Monedas originales',
      pt: 'Moedas originais',
      tr: 'Orijinal para birimleri',
      uk: 'Оригінальні валюти',
      zh: '原始货币',
      ar: 'العملات الأصلية',
      pl: 'Oryginalne waluty',
      it: 'Valute originali',
    }),
    currency: t({
      ru: 'Валюта',
      en: 'Currency',
      kk: 'Валюта',
      de: 'Währung',
      fr: 'Devise',
      es: 'Moneda',
      pt: 'Moeda',
      tr: 'Para birimi',
      uk: 'Валюта',
      zh: '货币',
      ar: 'العملة',
      pl: 'Waluta',
      it: 'Valuta',
    }),
  },
} satisfies Dictionary;

export default content;
