import { collectDashboardData, renderDashboard } from '../../core/dashboard.js';

export async function statusCommand(): Promise<void> {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;

  const spinner = ora('Collecting health data from providers...').start();

  try {
    const data = await collectDashboardData();
    spinner.stop();
    console.log(renderDashboard(data));
  } catch (error) {
    spinner.fail('Failed to collect dashboard data');
    console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  }
}
