import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'currencyDisplayToggle',
  content: {
    showInCurrency: t({
      ru: 'В валюте',
      en: 'Show in',
      kk: 'Валютада',
    }),
    showOriginal: t({
      ru: 'Оригинальные валюты',
      en: 'Original currencies',
      kk: 'Бастапқы валюталар',
    }),
    currency: t({
      ru: 'Валюта',
      en: 'Currency',
      kk: 'Валюта',
    }),
  },
} satisfies Dictionary;

export default content;
