import { readFile, readJson, writeFile, writeJson, appendFile, fileExists, deleteFile, ensureDir, copyFile, moveFile, listDir } from './file.js';

jest.mock('node:fs/promises');
import * as fs from 'node:fs/promises';

const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('readFile', () => {
  it('returns file content as a string', async () => {
    mockFs.readFile.mockResolvedValue('hello world' as any);
    const result = await readFile('/tmp/test.txt');
    expect(result).toBe('hello world');
    expect(mockFs.readFile).toHaveBeenCalledWith('/tmp/test.txt', 'utf-8');
  });

  it('throws a friendly message on ENOENT', async () => {
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('no such file'), { code: 'ENOENT' }));
    await expect(readFile('/tmp/missing.txt')).rejects.toThrow('file not found: /tmp/missing.txt');
  });

  it('throws a friendly message on EACCES', async () => {
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    await expect(readFile('/tmp/secret.txt')).rejects.toThrow('permission denied: /tmp/secret.txt');
  });

  it('throws a friendly message on EISDIR', async () => {
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('is a directory'), { code: 'EISDIR' }));
    await expect(readFile('/tmp/adir')).rejects.toThrow('path is a directory: /tmp/adir');
  });

  it('includes the error code for unrecognised fs errors', async () => {
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('device full'), { code: 'ENOSPC' }));
    await expect(readFile('/tmp/test.txt')).rejects.toThrow('ENOSPC:');
  });

  it('rethrows a plain Error unchanged when no code is present', async () => {
    mockFs.readFile.mockRejectedValue(new Error('unexpected'));
    await expect(readFile('/tmp/test.txt')).rejects.toThrow('unexpected');
  });
});

describe('readJson', () => {
  it('parses and returns JSON content', async () => {
    mockFs.readFile.mockResolvedValue('{"id":1,"name":"test"}' as any);
    const result = await readJson<{ id: number; name: string }>('/tmp/data.json');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('throws when the file contains invalid JSON', async () => {
    mockFs.readFile.mockResolvedValue('not json' as any);
    await expect(readJson('/tmp/bad.json')).rejects.toThrow('invalid JSON in file: /tmp/bad.json');
  });

  it('propagates read errors from readFile', async () => {
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('no such file'), { code: 'ENOENT' }));
    await expect(readJson('/tmp/missing.json')).rejects.toThrow('file not found: /tmp/missing.json');
  });
});

describe('writeFile', () => {
  it('creates the parent directory then writes the content', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    await writeFile('/tmp/dir/test.txt', 'content');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/dir', { recursive: true });
    expect(mockFs.writeFile).toHaveBeenCalledWith('/tmp/dir/test.txt', 'content', 'utf-8');
  });

  it('throws a friendly message on write error', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    await expect(writeFile('/tmp/test.txt', 'content')).rejects.toThrow('permission denied: /tmp/test.txt');
  });
});

describe('writeJson', () => {
  it('serialises JSON with the default indent of 2', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    await writeJson('/tmp/data.json', { id: 1 });
    expect(mockFs.writeFile).toHaveBeenCalledWith('/tmp/data.json', JSON.stringify({ id: 1 }, null, 2), 'utf-8');
  });

  it('uses the provided indent value', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    await writeJson('/tmp/data.json', { id: 1 }, 4);
    expect(mockFs.writeFile).toHaveBeenCalledWith('/tmp/data.json', JSON.stringify({ id: 1 }, null, 4), 'utf-8');
  });
});

describe('appendFile', () => {
  it('creates the parent directory then appends the content', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    await appendFile('/tmp/dir/log.txt', 'new line\n');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/dir', { recursive: true });
    expect(mockFs.appendFile).toHaveBeenCalledWith('/tmp/dir/log.txt', 'new line\n', 'utf-8');
  });

  it('throws a friendly message on append error', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    await expect(appendFile('/tmp/log.txt', 'data')).rejects.toThrow('permission denied: /tmp/log.txt');
  });
});

describe('fileExists', () => {
  it('returns true when the file is accessible', async () => {
    mockFs.access.mockResolvedValue(undefined);
    expect(await fileExists('/tmp/exists.txt')).toBe(true);
  });

  it('returns false when access throws', async () => {
    mockFs.access.mockRejectedValue(Object.assign(new Error('no such file'), { code: 'ENOENT' }));
    expect(await fileExists('/tmp/missing.txt')).toBe(false);
  });
});

describe('deleteFile', () => {
  it('calls rm with force: true', async () => {
    mockFs.rm.mockResolvedValue(undefined);
    await deleteFile('/tmp/old.txt');
    expect(mockFs.rm).toHaveBeenCalledWith('/tmp/old.txt', { force: true });
  });

  it('throws a friendly message on rm error', async () => {
    mockFs.rm.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    await expect(deleteFile('/tmp/protected.txt')).rejects.toThrow('permission denied: /tmp/protected.txt');
  });
});

describe('ensureDir', () => {
  it('calls mkdir with recursive: true', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    await ensureDir('/tmp/new/nested/dir');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/new/nested/dir', { recursive: true });
  });

  it('throws a friendly message on mkdir error', async () => {
    mockFs.mkdir.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    await expect(ensureDir('/tmp/restricted')).rejects.toThrow('permission denied: /tmp/restricted');
  });
});

describe('copyFile', () => {
  it('creates the dest directory then copies the file', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);
    await copyFile('/tmp/src.txt', '/tmp/dest/copy.txt');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/dest', { recursive: true });
    expect(mockFs.copyFile).toHaveBeenCalledWith('/tmp/src.txt', '/tmp/dest/copy.txt');
  });

  it('throws a friendly message when the source is not found', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.copyFile.mockRejectedValue(Object.assign(new Error('no such file'), { code: 'ENOENT' }));
    await expect(copyFile('/tmp/missing.txt', '/tmp/dest.txt')).rejects.toThrow('file not found: /tmp/missing.txt');
  });
});

describe('moveFile', () => {
  it('creates the dest directory then renames the file', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
    await moveFile('/tmp/old.txt', '/tmp/moved/new.txt');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp/moved', { recursive: true });
    expect(mockFs.rename).toHaveBeenCalledWith('/tmp/old.txt', '/tmp/moved/new.txt');
  });

  it('throws a friendly message when the source is not found', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rename.mockRejectedValue(Object.assign(new Error('no such file'), { code: 'ENOENT' }));
    await expect(moveFile('/tmp/missing.txt', '/tmp/new.txt')).rejects.toThrow('file not found: /tmp/missing.txt');
  });
});

describe('listDir', () => {
  it('returns the directory entries as strings', async () => {
    mockFs.readdir.mockResolvedValue(['a.txt', 'b.txt', 'subdir'] as any);
    const result = await listDir('/tmp/mydir');
    expect(result).toEqual(['a.txt', 'b.txt', 'subdir']);
    expect(mockFs.readdir).toHaveBeenCalledWith('/tmp/mydir');
  });

  it('throws a friendly message when the directory is not found', async () => {
    mockFs.readdir.mockRejectedValue(Object.assign(new Error('no such file or directory'), { code: 'ENOENT' }));
    await expect(listDir('/tmp/missing')).rejects.toThrow('file not found: /tmp/missing');
  });
});
