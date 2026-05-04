import { Command } from 'commander';
import { cp } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../templates');

const ROOT_FILES = ['.env.template', 'tsconfig.json', 'tsconfig.test.json', 'jest.config.ts', 'package.json', 'README.md', 'GUIDE.md'];

export const initCommand = new Command('init')
  .description('Scaffold a new dtk project in the current directory')
  .action(async () => {
    const initDir = join(TEMPLATES_DIR, 'init');
    const dest = process.cwd();

    await cp(join(initDir, 'src'), join(dest, 'src'), { recursive: true });
    await cp(join(initDir, 'gitignore'), join(dest, '.gitignore'));
    for (const file of ROOT_FILES) {
      await cp(join(initDir, file), join(dest, file));
    }

    console.log('Project scaffolded. Installing dependencies...');
    execSync('npm install', { cwd: dest, stdio: 'inherit' });
  });
