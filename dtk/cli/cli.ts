#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from './init.js';
import { addCommand } from './add.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();
program
  .name('dtk')
  .description('Developer toolkit scaffolder')
  .version(version);

program.addCommand(initCommand);
program.addCommand(addCommand);
program.parse();
