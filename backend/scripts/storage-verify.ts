/* eslint-disable no-console */
import 'dotenv/config';
import * as path from 'path';
import { FileStorageService } from '../src/common/services/file-storage.service';
import { AppDataSource } from '../src/data-source';
import { Statement } from '../src/entities/statement.entity';
import type { Repository } from 'typeorm';

interface VerifyResult {
  id: string;
  fileName: string;
  onDisk: boolean;
  inDb: boolean;
  repaired: boolean;
  error?: string;
}

async function run() {
  const argv = process.argv.slice(2);
  const repair = argv.includes('--repair');
  const limitArg = argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : undefined;

  await AppDataSource.initialize();
  const statementRepo = AppDataSource.getRepository(Statement);
  const storage = new FileStorageService(statementRepo as unknown as Repository<Statement>);

  const qb = statementRepo.createQueryBuilder('statement').orderBy('statement.createdAt', 'DESC');
  if (limit && Number.isFinite(limit)) {
    qb.take(limit);
  }

  const statements = await qb.getMany();
  const results: VerifyResult[] = [];

  for (const st of statements) {
    try {
      const availability = await storage.getFileAvailability(st);
      let repaired = false;
      if (repair && !availability.onDisk && availability.inDb) {
        const restored = await storage.restoreFile(st);
        repaired = Boolean(restored);
      }
      results.push({
        id: st.id,
        fileName: st.fileName,
        onDisk: availability.onDisk,
        inDb: availability.inDb,
        repaired,
      });
    } catch (error) {
      results.push({
        id: st.id,
        fileName: st.fileName,
        onDisk: false,
        inDb: false,
        repaired: false,
        error: (error as Error)?.message,
      });
    }
  }

  const missing = results.filter(r => !r.onDisk && !r.inDb);
  const restored = results.filter(r => r.repaired);
  const ok = results.filter(r => r.onDisk || r.inDb);

  console.log('Storage verify summary');
  console.log(`Total checked: ${results.length}`);
  console.log(`Healthy (disk/db): ${ok.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Repaired: ${restored.length}`);

  if (missing.length) {
    console.log('\nMissing files:');
    missing
      .slice(0, 20)
      .forEach(m => console.log(`- ${m.id} :: ${m.fileName} :: error=${m.error || 'missing'}`));
    if (missing.length > 20) {
      console.log(`... and ${missing.length - 20} more`);
    }
  }

  await AppDataSource.destroy();
}

run().catch(error => {
  console.error('[storage-verify] failed:', error);
  process.exit(1);
});
