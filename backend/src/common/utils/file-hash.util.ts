import { createHash } from 'crypto';
import * as fs from 'fs';

export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function calculateFileHashFromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
