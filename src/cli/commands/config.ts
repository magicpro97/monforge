import { Command } from 'commander';
import { loadConfig, setConfigValue, getConfigValue, getConfigFilePath, normalizeKey } from '../../core/config.js';

export const configCommand = new Command('config')
  .description('Manage MonForge configuration');

configCommand
  .command('set <key> <value>')
  .description('Set a config value (e.g., sentry.authToken sk-xxx)')
  .action(async (key: string, value: string) => {
    const chalk = (await import('chalk')).default;

    const fullKey = normalizeKey(key);
    setConfigValue(fullKey, value);

    const display = fullKey.toLowerCase().includes('token') || fullKey.toLowerCase().includes('key')
      ? value.slice(0, 6) + '...' + value.slice(-4)
      : value;
    console.log(chalk.green(`  ✓ Set ${key} = ${display}`));
  });

configCommand
  .command('get <key>')
  .description('Get a config value')
  .action(async (key: string) => {
    const chalk = (await import('chalk')).default;
    const fullKey = normalizeKey(key);
    const value = getConfigValue(fullKey);

    if (value === undefined) {
      console.log(chalk.yellow(`  ⚠ Key "${key}" not found`));
    } else {
      const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      const masked = (fullKey.toLowerCase().includes('token') || fullKey.toLowerCase().includes('key')) && typeof value === 'string'
        ? value.slice(0, 6) + '...' + value.slice(-4)
        : display;
      console.log(`  ${key} = ${masked}`);
    }
  });

configCommand
  .command('list')
  .description('Show all configuration')
  .action(async () => {
    const chalk = (await import('chalk')).default;
    const config = loadConfig();

    console.log(chalk.bold('\n  📋 MonForge Configuration'));
    console.log(chalk.dim(`  File: ${getConfigFilePath()}\n`));

    // Providers
    console.log(chalk.bold('  Providers:'));
    for (const [name, pConfig] of Object.entries(config.providers)) {
      const hasToken = pConfig.authToken && pConfig.authToken.length > 0;
      const hasAppId = pConfig.appId && pConfig.appId.length > 0;
      const isConfigured = hasToken || hasAppId;
      const status = isConfigured ? chalk.green('✓ configured') : chalk.dim('✗ not configured');
      console.log(`    ${name.padEnd(14)} ${status}`);
    }

    // Defaults
    console.log('');
    console.log(chalk.bold('  Defaults:'));
    console.log(`    Error limit:   ${config.defaults.errorLimit}`);
    console.log(`    Review limit:  ${config.defaults.reviewLimit}`);
    console.log(`    Report format: ${config.defaults.reportFormat}`);

    // Alerts
    console.log('');
    console.log(chalk.bold('  Alerts:'));
    if (config.alerts.length === 0) {
      console.log(chalk.dim('    No alert rules configured'));
    } else {
      console.log(`    ${config.alerts.length} rule(s) active`);
    }
    console.log('');
  });
