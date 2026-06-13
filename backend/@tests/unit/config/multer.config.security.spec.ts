import { resolveSafeUploadExtension } from '@/config/multer.config';

describe('multerConfig upload filename security', () => {
  it.each([
    ['application/pdf', 'statement.p$(touch owned)f', '.pdf'],
    ['text/csv', 'statement.c`touch owned`sv', '.csv'],
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'statement.x$(touch owned)lsx',
      '.xlsx',
    ],
    ['application/octet-stream', 'statement.$(touch owned)', '.bin'],
  ])('chooses safe extension for %s / %s', (mimetype, originalname, expected) => {
    expect(resolveSafeUploadExtension({ mimetype, originalname })).toBe(expected);
  });
});
