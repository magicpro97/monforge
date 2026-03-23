#!/usr/bin/env node
import { Command } from 'commander';
import { statusCommand } from './cli/commands/status.js';
import { reviewsCommand } from './cli/commands/reviews.js';
import { errorsCommand } from './cli/commands/errors.js';
import { alertsCommand } from './cli/commands/alerts.js';
import { reportCommand } from './cli/commands/report.js';
import { configCommand } from './cli/commands/config.js';

const program = new Command();

program
  .name('monforge')
  .description('📊 MonForge — Production Monitoring CLI\n\n  Unified dashboard for Sentry, Crashlytics, app store reviews.\n  Aggregate crash rates, errors, ratings, and alerts in your terminal.')
  .version('1.0.0');

// Status dashboard
program
  .command('status')
  .description('Show unified health dashboard (crash rate, ANR, ratings, errors)')
  .action(statusCommand);

// Reviews
program
  .command('reviews [platform]')
  .description('Fetch & display app store reviews (ios/android/all)')
  .action(reviewsCommand);

// Errors
program
  .command('errors')
  .description('List top errors/crashes from monitoring providers')
  .option('-l, --limit <number>', 'Maximum number of errors to display', '10')
  .action(errorsCommand);

// Report
program
  .command('report')
  .description('Generate weekly health report')
  .option('-f, --format <type>', 'Output format (md, txt)', 'md')
  .option('-o, --output <path>', 'Save report to file')
  .action(reportCommand);

// Sub-commands
program.addCommand(alertsCommand);
program.addCommand(configCommand);

// Show help by default if no arguments
if (process.argv.length <= 2) {
  program.outputHelp();
  console.log('');
  console.log('  Quick start:');
  console.log('    $ monforge config set sentry.authToken <token>');
  console.log('    $ monforge config set sentry.orgSlug <org>');
  console.log('    $ monforge config set sentry.projectSlug <project>');
  console.log('    $ monforge status');
  console.log('    $ monforge errors --limit 5');
  console.log('    $ monforge reviews ios');
  console.log('');
} else {
  program.parse();
}
