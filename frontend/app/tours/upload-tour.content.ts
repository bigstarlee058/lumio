/**
 * Content для тура по странице загрузки
 */

import { type Dictionary, t } from 'intlayer';

const content = {
  key: 'upload-tour',
  content: {
    name: t({
      ru: 'Тур по загрузке',
      en: 'Upload Tour',
      kk: 'Жүктеу турі',
    }),
    description: t({
      ru: 'Узнайте, как загружать документы на отдельной странице загрузки',
      en: 'Learn how to upload documents on the standalone upload page',
      kk: 'Құжаттарды бөлек жүктеу бетінде қалай жүктеу керегін біліңіз',
    }),
    steps: {
      welcome: {
        title: t({
          ru: 'Страница загрузки',
          en: 'Upload Page',
          kk: 'Жүктеу беті',
        }),
        description: t({
          ru: 'Здесь собраны все шаги загрузки: выбор связанных Google Sheets, добавление файлов, проверка списка и отправка на обработку.',
          en: 'This page brings the full upload flow together: optional Google Sheets selection, adding files, reviewing the list, and sending everything for processing.',
          kk: 'Бұл бетте жүктеу ағынының барлық қадамдары бар: қажет болса Google Sheets таңдау, файл қосу, тізімді тексеру және өңдеуге жіберу.',
        }),
      },
      dragDrop: {
        title: t({
          ru: 'Добавление файлов',
          en: 'Add Files',
          kk: 'Файл қосу',
        }),
        description: t({
          ru: 'Перетащите файлы сюда или нажмите, чтобы выбрать их вручную. Страница принимает банковские документы и сразу готовит их к загрузке.',
          en: 'Drop files here or click to pick them manually. The page accepts supported banking documents and prepares them for upload right away.',
          kk: 'Файлдарды осы жерге сүйреп апарыңыз немесе қолмен таңдау үшін басыңыз. Бет қолдау көрсетілетін банк құжаттарын бірден жүктеуге дайындайды.',
        }),
      },
      allowDuplicates: {
        title: t({
          ru: 'Повторная загрузка',
          en: 'Duplicate Handling',
          kk: 'Қайта жүктеу',
        }),
        description: t({
          ru: 'Оставьте эту опцию выключенной в обычном потоке. Включайте её только если осознанно хотите повторно загрузить уже известный документ.',
          en: 'Leave this off for the normal flow. Turn it on only when you intentionally want to upload a document the system may already know about.',
          kk: 'Кәдімгі ағында бұл опцияны өшірулі қалдырыңыз. Оны жүйеде бұрыннан болуы мүмкін құжатты әдейі қайта жүктегіңіз келгенде ғана қосыңыз.',
        }),
      },
      fileList: {
        title: t({
          ru: 'Проверка перед отправкой',
          en: 'Review Before Upload',
          kk: 'Жіберер алдындағы тексеру',
        }),
        description: t({
          ru: 'Здесь видно, какие файлы будут отправлены. Перед загрузкой удобно проверить имена, размер и удалить лишнее.',
          en: 'This list shows exactly which files will be sent. It is the right place to verify names, sizes, and remove anything extra before uploading.',
          kk: 'Бұл тізімде қандай файлдар жіберілетіні көрсетіледі. Жүктеуден бұрын атауларды, өлшемдерді тексеріп, артықтарын өшіруге болады.',
        }),
      },
      uploadButton: {
        title: t({
          ru: 'Отправить на обработку',
          en: 'Start Upload',
          kk: 'Жүктеуді бастау',
        }),
        description: t({
          ru: 'Когда список готов, эта кнопка отправляет файлы в обработку. После успешной загрузки страница переведёт вас обратно к выпискам.',
          en: 'Once the list looks right, this button sends the files for processing. After a successful upload the page returns you to Statements.',
          kk: 'Тізім дайын болғанда, бұл батырма файлдарды өңдеуге жібереді. Сәтті жүктеуден кейін бет сізді қайтадан Үзінділерге апарады.',
        }),
      },
      googleSheets: {
        title: t({
          ru: 'Связь с Google Sheets',
          en: 'Google Sheets Link',
          kk: 'Google Sheets байланысы',
        }),
        description: t({
          ru: 'Этот блок нужен, если вы хотите связать загрузку с подключённой таблицей Google Sheets. Если синхронизация не нужна, поле можно оставить пустым.',
          en: 'Use this section when the upload should be linked to a connected Google Sheet. If you do not need sync, you can leave it empty.',
          kk: 'Егер жүктеуді қосылған Google Sheets кестесімен байланыстырғыңыз келсе, осы блокты пайдаланыңыз. Синхрондау керек болмаса, өрісті бос қалдыруға болады.',
        }),
      },
      completed: {
        title: t({
          ru: 'Готово',
          en: 'All Set',
          kk: 'Дайын',
        }),
        description: t({
          ru: 'Теперь тур соответствует текущей странице загрузки. Добавьте файлы, проверьте список и отправьте документы на обработку.',
          en: 'The tour now matches the current upload page. Add files, review the list, and send the documents for processing.',
          kk: 'Бұл тур енді қазіргі жүктеу бетіне сай келеді. Файлдарды қосып, тізімді тексеріп, құжаттарды өңдеуге жіберіңіз.',
        }),
      },
    },
  },
} satisfies Dictionary;

export default content;
