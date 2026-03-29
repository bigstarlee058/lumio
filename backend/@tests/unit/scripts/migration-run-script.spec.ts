import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

describe('migration run package script', () => {
  it('points to an executable migration runner path', () => {
    const backendRoot = process.cwd();
    const packageJsonPath = path.join(backendRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    const migrationRunScript = packageJson.scripts?.['migration:run'];

    expect(migrationRunScript).toBeDefined();
    expect(migrationRunScript).not.toContain('node dist/scripts/run-migrations.js');

    const expectedRunnerPath = path.join(backendRoot, 'scripts', 'run-migrations.ts');
    expect(existsSync(expectedRunnerPath)).toBe(true);
  });
});
