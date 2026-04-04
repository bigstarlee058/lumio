import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { buildContentDisposition } from './http-file.util';

type FileDisposition = 'inline' | 'attachment';

type PipeFileStreamResponseOptions = {
  disposition: FileDisposition;
  fileName: string;
  mimeType: string;
  errorMessage: string;
};

type ResponseStream = {
  on(event: 'error', handler: (error: NodeJS.ErrnoException) => void): unknown;
  pipe(destination: Response): unknown;
};

function resolveStreamErrorStatus(error: NodeJS.ErrnoException): HttpStatus {
  return error?.code === 'ENOENT' || error?.code === 'EISDIR'
    ? HttpStatus.NOT_FOUND
    : HttpStatus.INTERNAL_SERVER_ERROR;
}

export function pipeFileStreamResponse(
  res: Response,
  stream: ResponseStream,
  options: PipeFileStreamResponseOptions,
): void {
  res.setHeader('Content-Type', options.mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(options.disposition, options.fileName));

  stream.on('error', (error: NodeJS.ErrnoException) => {
    const status = resolveStreamErrorStatus(error);

    if (!res.headersSent) {
      res.status(status).json({
        error: {
          code: status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
          message: status === HttpStatus.NOT_FOUND ? 'File not found on disk' : options.errorMessage,
        },
      });
      return;
    }

    res.destroy(error);
  });

  stream.pipe(res);
}
