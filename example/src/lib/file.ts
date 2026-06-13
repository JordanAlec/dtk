import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  appendFile as fsAppendFile,
  rm,
  mkdir,
  copyFile as fsCopyFile,
  rename,
  readdir,
  access,
} from "node:fs/promises";
import { dirname } from "node:path";

function normalizeError(err: unknown, path: string): Error {
  if (err instanceof Error && "code" in err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return new Error(`file not found: ${path}`);
    if (code === "EACCES") return new Error(`permission denied: ${path}`);
    if (code === "EISDIR") return new Error(`path is a directory: ${path}`);
    return new Error(`${code}: ${(err as Error).message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function readFile(path: string): Promise<string> {
  try {
    return await fsReadFile(path, "utf-8");
  } catch (err) {
    throw normalizeError(err, path);
  }
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  const content = await readFile(path);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`invalid JSON in file: ${path}`);
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await fsWriteFile(path, content, "utf-8");
  } catch (err) {
    throw normalizeError(err, path);
  }
}

export async function writeJson(path: string, data: unknown, indent = 2): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, indent));
}

export async function appendFile(path: string, content: string): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await fsAppendFile(path, content, "utf-8");
  } catch (err) {
    throw normalizeError(err, path);
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch (err) {
    throw normalizeError(err, path);
  }
}

export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (err) {
    throw normalizeError(err, path);
  }
}

export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    await mkdir(dirname(dest), { recursive: true });
    await fsCopyFile(src, dest);
  } catch (err) {
    throw normalizeError(err, src);
  }
}

export async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await mkdir(dirname(dest), { recursive: true });
    await rename(src, dest);
  } catch (err) {
    throw normalizeError(err, src);
  }
}

export async function listDir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch (err) {
    throw normalizeError(err, path);
  }
}
