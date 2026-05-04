import { Command } from 'commander';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { injectAtSentinel } from './utils/patch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../templates');

const PLUGIN_MAP: Record<string, string> = {
  'aws-sqs': 'aws-sqs',
  'aws-sns': 'aws-sns',
  'aws-dynamo': 'aws-dynamo',
  'aws-s3': 'aws-s3',
  'open-ai': 'open-ai',
};

interface PluginTransform {
  from: string;
  to: string;
}

interface PluginManifest {
  name: string;
  description: string;
  dependencies?: Record<string, string>;
  files: Array<{ src: string; dest: string }>;
  env?: string;
  example?: string;
  transforms?: Record<string, PluginTransform[]>;
  patches: Record<string, Record<string, string | string[]>>;
}

export const addCommand = new Command('add')
  .description('Add a service plugin to the project')
  .argument('<plugin>', `Plugin to add. Available: ${Object.keys(PLUGIN_MAP).join(', ')}`)
  .action(async (plugin: string) => {
    const pluginKey = PLUGIN_MAP[plugin];
    if (!pluginKey) {
      console.error(`Unknown plugin: "${plugin}". Available: ${Object.keys(PLUGIN_MAP).join(', ')}`);
      process.exit(1);
    }

    const pluginDir = join(TEMPLATES_DIR, 'plugins', pluginKey);
    const manifest: PluginManifest = JSON.parse(
      await readFile(join(pluginDir, 'plugin.json'), 'utf8')
    );
    const destDir = process.cwd();

    for (const file of manifest.files) {
      const dest = join(destDir, file.dest);
      await mkdir(dirname(dest), { recursive: true });
      let content = await readFile(join(pluginDir, file.src), 'utf8');
      for (const { from, to } of manifest.transforms?.[file.src] ?? []) {
        content = content.replaceAll(from, to);
      }
      await writeFile(dest, content, 'utf8');
      console.log(`  created  ${file.dest}`);
    }

    for (const [targetFile, sentinels] of Object.entries(manifest.patches)) {
      const filePath = join(destDir, targetFile);
      let content = await readFile(filePath, 'utf8');
      for (const [sentinel, lines] of Object.entries(sentinels)) {
        for (const line of Array.isArray(lines) ? lines : [lines]) {
          content = injectAtSentinel(content, sentinel, line);
        }
      }
      await writeFile(filePath, content, 'utf8');
      console.log(`  patched  ${targetFile}`);
    }

    if (manifest.env) {
      const fragment = (await readFile(join(pluginDir, manifest.env), 'utf8')).trim();
      const envPath = join(destDir, '.env.template');
      const envExists = await access(envPath).then(() => true).catch(() => false);
      const envContent = envExists ? await readFile(envPath, 'utf8') : '';
      const missingLines = fragment.split('\n').filter(line => !envContent.includes(line));
      if (missingLines.length > 0) {
        const base = envContent.trimEnd();
        await writeFile(envPath, (base ? base + '\n' : '') + missingLines.join('\n') + '\n', 'utf8');
        console.log(`  ${envExists ? 'updated' : 'created'}  .env.template`);
      }
    }

    if (manifest.example) {
      const runbookDest = join(destDir, 'src', 'runbooks', `${plugin}.ts`);
      const alreadyExists = await access(runbookDest).then(() => true).catch(() => false);
      if (!alreadyExists) {
        await mkdir(dirname(runbookDest), { recursive: true });
        await writeFile(runbookDest, await readFile(join(pluginDir, manifest.example), 'utf8'), 'utf8');
        console.log(`  created  src/runbooks/${plugin}.ts`);

        const pkgPath = join(destDir, 'package.json');
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
        const scriptKey = `runbook:${plugin}`;
        if (!pkg.scripts[scriptKey]) {
          pkg.scripts[scriptKey] = `tsx src/runbooks/${plugin}.ts`;
          await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
          console.log(`  updated  package.json (added ${scriptKey})`);
        }
      } else {
        console.log(`  skipped  src/runbooks/${plugin}.ts (already exists)`);
      }
    }

    console.log(`\nPlugin "${plugin}" added.`);
    if (manifest.dependencies) {
      const deps = Object.entries(manifest.dependencies)
        .map(([k, v]) => `${k}@${v}`)
        .join(' ');
      console.log(`Installing dependencies: npm install ${deps}`);
      execSync(`npm install ${deps}`, { cwd: destDir, stdio: 'inherit' });
    }
  });
