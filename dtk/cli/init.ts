import { Command } from 'commander';
import { cp, readFile, writeFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../templates');

const ROOT_FILES = ['.env.template', 'tsconfig.json', 'tsconfig.test.json', 'jest.config.ts', 'README.md', 'GUIDE.md'];

export const initCommand = new Command('init')
  .description('Scaffold a new dtk project in the current directory')
  .argument('[name]', 'project name (defaults to the current directory name)')
  .action(async (name?: string) => {
    const initDir = join(TEMPLATES_DIR, 'init');
    const dest = process.cwd();
    const projectName = name ?? basename(dest);

    await cp(join(initDir, 'src'), join(dest, 'src'), { recursive: true });
    await cp(join(initDir, 'gitignore'), join(dest, '.gitignore'));
    for (const file of ROOT_FILES) {
      await cp(join(initDir, file), join(dest, file));
    }

    const pkgRaw = await readFile(join(initDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw);
    pkg.name = projectName;
    await writeFile(join(dest, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8');

    console.log('Project scaffolded. Installing dependencies...');
    execSync('npm install --no-workspaces', { cwd: dest, stdio: 'inherit' });
  });
