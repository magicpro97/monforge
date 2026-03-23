import * as fs from 'node:fs';
import { collectDashboardData } from '../../core/dashboard.js';
import { generateReport } from '../../core/reporter.js';

interface ReportOptions {
  format?: string;
  output?: string;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;

  const format = (options.format || 'md') as 'md' | 'txt';
  const spinner = ora('Generating health report...').start();

  try {
    const data = await collectDashboardData();
    const report = generateReport(data, format);

    spinner.stop();

    if (options.output) {
      fs.writeFileSync(options.output, report, 'utf-8');
      console.log(chalk.green(`\n  ✓ Report saved to ${options.output}`));
    } else {
      console.log('');
      console.log(report);
    }
    console.log('');
  } catch (error) {
    spinner.fail('Failed to generate report');
    console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  }
}
