import { Command } from 'commander';
import { loadAlerts, addAlert, removeAlert, parseAlertRule } from '../../core/alerts.js';

interface RecommendedAlert {
  rule: string;
  severity: string;
  rationale: string;
}

const RECOMMENDED_ALERTS: RecommendedAlert[] = [
  { rule: 'crash-rate > 0.1', severity: 'Critical', rationale: 'Top apps maintain 99.9%+ crash-free rate' },
  { rule: 'anr-rate > 0.5', severity: 'High', rationale: 'ANR rate should stay below 0.5%' },
  { rule: 'rating < 4.0', severity: 'Medium', rationale: 'Apps below 4.0 lose significant downloads' },
  { rule: 'review-rating < 3.0', severity: 'Warning', rationale: 'Individual reviews below 3.0 indicate issues' },
  { rule: 'error-count > 100', severity: 'High', rationale: 'More than 100 errors/day needs attention' },
];

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

alertsCommand
  .command('recommend')
  .description('Show recommended alert thresholds based on industry benchmarks')
  .option('--apply-recommended', 'Auto-create all recommended alert rules')
  .action(async (options: { applyRecommended?: boolean }) => {
    const chalk = (await import('chalk')).default;

    console.log(chalk.bold('\n  📊 Recommended Alert Thresholds (based on industry research)'));
    console.log('');

    for (const rec of RECOMMENDED_ALERTS) {
      const parts = rec.rule.split(/\s+/);
      const metric = parts[0];
      const op = parts[1];
      const threshold = parts[2];
      console.log(`  ${chalk.cyan(metric)} ${op} ${chalk.yellow(threshold)}     ${chalk.dim(rec.severity + ':')} ${rec.rationale}`);
    }

    console.log('');

    if (options.applyRecommended) {
      let created = 0;
      for (const rec of RECOMMENDED_ALERTS) {
        const parsed = parseAlertRule(rec.rule);
        if (parsed) {
          addAlert(parsed);
          created++;
        }
      }
      console.log(chalk.green(`  ✓ Created ${created} recommended alert rules.`));
    } else {
      console.log(chalk.dim('  💡 Set these with:'));
      for (const rec of RECOMMENDED_ALERTS) {
        console.log(chalk.dim(`    monforge alerts set "${rec.rule}"`));
      }
      console.log('');
      console.log(chalk.dim('  Or apply all at once:'));
      console.log(chalk.dim('    monforge alerts recommend --apply-recommended'));
    }
    console.log('');
  });
