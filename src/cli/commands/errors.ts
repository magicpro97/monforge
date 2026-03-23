import { loadConfig } from '../../core/config.js';
import { SentryProvider } from '../../providers/sentry.js';
import { CrashlyticsProvider } from '../../providers/crashlytics.js';
import type { MonitoringProvider } from '../../types/index.js';

interface ErrorsOptions {
  limit?: string;
}

export async function errorsCommand(options: ErrorsOptions): Promise<void> {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;

  const config = loadConfig();
  const limit = parseInt(options.limit || String(config.defaults.errorLimit), 10);
  const providers: MonitoringProvider[] = [];

  const sentry = new SentryProvider();
  sentry.configure(config.providers.sentry as unknown as Record<string, string>);
  if (sentry.isConfigured()) providers.push(sentry);

  const crashlytics = new CrashlyticsProvider();
  crashlytics.configure(config.providers.crashlytics as unknown as Record<string, string>);
  if (crashlytics.isConfigured()) providers.push(crashlytics);

  if (providers.length === 0) {
    console.log(chalk.yellow('\n  ⚠  No monitoring providers configured.'));
    console.log(chalk.dim('  Configure with:'));
    console.log(chalk.dim('    monforge config set sentry.authToken <token>'));
    console.log(chalk.dim('    monforge config set sentry.orgSlug <org>'));
    console.log(chalk.dim('    monforge config set sentry.projectSlug <project>'));
    console.log('');
    return;
  }

  const spinner = ora('Fetching top errors...').start();

  try {
    for (const provider of providers) {
      const errors = await provider.getErrors(limit);
      spinner.stop();

      console.log('');
      console.log(chalk.bold(`  🐛 ${provider.name} — Top Errors`));
      console.log('');

      if (errors.length === 0) {
        console.log(chalk.green('  ✓ No errors found. Nice!'));
      } else {
        // Table header
        console.log(
          chalk.dim('  #   Level    Count    Users    Title')
        );
        console.log(chalk.dim('  ' + '─'.repeat(60)));

        for (let i = 0; i < errors.length; i++) {
          const err = errors[i];
          const levelColor =
            err.level === 'fatal' ? chalk.red :
            err.level === 'error' ? chalk.redBright :
            err.level === 'warning' ? chalk.yellow : chalk.dim;

          const num = String(i + 1).padStart(2);
          const level = levelColor(err.level.padEnd(8));
          const count = String(err.count).padStart(7);
          const users = String(err.userCount).padStart(7);
          const title = err.title.substring(0, 40);

          console.log(`  ${num}  ${level} ${count}  ${users}    ${title}`);
        }
      }
      console.log('');
    }
  } catch (error) {
    spinner.fail('Failed to fetch errors');
    console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  }
}
