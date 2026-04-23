import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'confirmModal',
  content: {
    buttons: {
      confirm: t({
        ru: 'Подтвердить',
        en: 'Confirm',
        kk: 'Растау',
        de: 'Bestätigen',
        fr: 'Confirmer',
        es: 'Confirmar',
        pt: 'Confirmar',
        tr: 'Onayla',
        uk: 'Підтвердити',
        zh: '确认',
        ar: 'تأكيد',
        pl: 'Potwierdź',
        it: 'Conferma',
      }),
      cancel: t({
        ru: 'Отмена',
        en: 'Cancel',
        kk: 'Болдырмау',
        de: 'Abbrechen',
        fr: 'Annuler',
        es: 'Cancelar',
        pt: 'Cancelar',
        tr: 'İptal',
        uk: 'Скасувати',
        zh: '取消',
        ar: 'إلغاء',
        pl: 'Anuluj',
        it: 'Annulla',
      }),
    },
    sr: {
      close: t({
        ru: 'Закрыть',
        en: 'Close',
        kk: 'Жабу',
        de: 'Schließen',
        fr: 'Fermer',
        es: 'Cerrar',
        pt: 'Fechar',
        tr: 'Kapat',
        uk: 'Закрити',
        zh: '关闭',
        ar: 'إغلاق',
        pl: 'Zamknij',
        it: 'Chiudi',
      }),
    },
  },
} satisfies Dictionary;

export default content;
