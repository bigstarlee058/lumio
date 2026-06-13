import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runExecutable } from '@/common/utils/thumbnail-command.util';

jest.mock('node:util', () => ({
  promisify: jest.fn(() => jest.fn().mockResolvedValue({ stdout: '', stderr: '' })),
}));

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

describe('thumbnail command execution', () => {
  it('uses execFile arguments so shell metacharacters in paths are not interpreted', async () => {
    const execFileAsync = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    (promisify as unknown as jest.Mock).mockReturnValue(execFileAsync);

    await runExecutable('python3', [
      '/app/scripts/generate-thumbnail.py',
      '/uploads/id.p$(touch owned)f',
      '/tmp/thumb.png',
      '320',
    ]);

    expect(promisify).toHaveBeenCalledWith(execFile);
    expect(execFileAsync).toHaveBeenCalledWith('python3', [
      '/app/scripts/generate-thumbnail.py',
      '/uploads/id.p$(touch owned)f',
      '/tmp/thumb.png',
      '320',
    ]);
  });
});
