import * as path from 'path';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://finflow:finflow@localhost:5432/finflow';

const resolveCompiledGlob = (compiledDirName: string, sourceDirName: string) => {
  const compiledDir = path.join(__dirname, compiledDirName);
  const compiledUnderSrcDir = path.join(__dirname, 'src', compiledDirName);

  if (existsSync(compiledDir)) {
    return path.join(compiledDir, '*.{ts,js}');
  }

  if (existsSync(compiledUnderSrcDir)) {
    return path.join(compiledUnderSrcDir, '*.{ts,js}');
  }

  return path.join(__dirname, sourceDirName, '*.{ts,js}');
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [resolveCompiledGlob('entities', 'entities')],
  migrations: [resolveCompiledGlob('migrations', 'migrations')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
