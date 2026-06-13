import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const runExecutable = async (command: string, args: string[]): Promise<void> => {
  const execFileAsync = promisify(execFile);
  await execFileAsync(command, args);
};
