#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './cli/init.js';
import { addCommand } from './cli/add.js';

const program = new Command();
program
  .name('dtk')
  .description('Developer toolkit scaffolder')
  .version('0.0.1');

program.addCommand(initCommand);
program.addCommand(addCommand);
program.parse();
