import { Command } from 'commander';
import { loadAlerts, addAlert, removeAlert, parseAlertRule } from '../../core/alerts.js';

export const alertsCommand = new Command('alerts')
  .description('Manage alert rules for monitoring thresholds');

alertsCommand
  .command('set <rule>')
  .description('Set an alert rule (e.g., "crash-rate > 1", "rating < 4.0")')
  .action(async (rule: string) => {
    const chalk = (await import('chalk')).default;

    const parsed = parseAlertRule(rule);
    if (!parsed) {
      console.log(chalk.red('\n  ✗ Invalid alert rule format.'));
      console.log(chalk.dim('  Expected: <metric> <operator> <threshold>'));
      console.log(chalk.dim('  Metrics:  crash-rate, anr-rate, rating, error-count, review-rating'));
      console.log(chalk.dim('  Example:  monforge alerts set "crash-rate > 1"'));
      console.log(chalk.dim('           monforge alerts set "rating < 4.0"'));
      console.log('');
      return;
    }

    const newRule = addAlert(parsed);
    console.log(chalk.green(`\n  ✓ Alert rule created: ${newRule.name}`));
    console.log(chalk.dim(`  ID: ${newRule.id}`));
    console.log('');
  });

alertsCommand
  .command('list')
  .description('List all active alert rules')
  .action(async () => {
    const chalk = (await import('chalk')).default;

    const alerts = loadAlerts();

    console.log(chalk.bold('\n  🚨 Alert Rules'));
    console.log('');

    if (alerts.length === 0) {
      console.log(chalk.dim('  No alert rules configured.'));
      console.log(chalk.dim('  Set one with: monforge alerts set "crash-rate > 1"'));
    } else {
      for (const rule of alerts) {
        const status = rule.enabled ? chalk.green('●') : chalk.dim('○');
        const date = new Date(rule.createdAt).toLocaleDateString();
        console.log(`  ${status} ${rule.name}`);
        console.log(chalk.dim(`    ID: ${rule.id} · Created: ${date}`));
      }
    }
    console.log('');
  });

alertsCommand
  .command('remove <id>')
  .description('Remove an alert rule by ID')
  .action(async (id: string) => {
    const chalk = (await import('chalk')).default;

    const removed = removeAlert(id);
    if (removed) {
      console.log(chalk.green(`\n  ✓ Alert rule removed: ${id}`));
    } else {
      console.log(chalk.yellow(`\n  ⚠ Alert rule not found: ${id}`));
    }
    console.log('');
  });
