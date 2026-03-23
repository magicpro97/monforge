import { loadConfig } from '../../core/config.js';
import { AppStoreProvider } from '../../providers/appstore.js';
import { PlayStoreProvider } from '../../providers/playstore.js';
import type { Review, ReviewProvider } from '../../types/index.js';

export async function reviewsCommand(platform: string): Promise<void> {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;

  const config = loadConfig();
  const providers: ReviewProvider[] = [];

  if (platform === 'ios' || platform === 'all' || !platform) {
    const appstore = new AppStoreProvider();
    appstore.configure(config.providers.appstore as unknown as Record<string, string>);
    if (appstore.isConfigured()) providers.push(appstore);
  }

  if (platform === 'android' || platform === 'all' || !platform) {
    const playstore = new PlayStoreProvider();
    playstore.configure(config.providers.playstore as unknown as Record<string, string>);
    if (playstore.isConfigured()) providers.push(playstore);
  }

  if (providers.length === 0) {
    console.log(chalk.yellow('\n  ⚠  No review providers configured.'));
    console.log(chalk.dim('  Configure with:'));
    console.log(chalk.dim('    monforge config set appstore.appId <id>'));
    console.log(chalk.dim('    monforge config set playstore.appId <id>'));
    console.log('');
    return;
  }

  const spinner = ora('Fetching reviews...').start();

  try {
    for (const provider of providers) {
      const reviews = await provider.getReviews(config.defaults.reviewLimit);
      const summary = await provider.getRatingSummary();
      spinner.stop();

      console.log('');
      console.log(chalk.bold(`  📱 ${provider.name} Reviews`));

      if (summary) {
        const stars = '★'.repeat(Math.round(summary.average)) + '☆'.repeat(5 - Math.round(summary.average));
        console.log(chalk.dim(`  ${stars} ${summary.average.toFixed(1)} (${summary.total.toLocaleString()} ratings)`));
      }
      console.log('');

      if (reviews.length === 0) {
        console.log(chalk.dim('  No reviews found.'));
      } else {
        for (const review of reviews) {
          renderReview(review, chalk);
        }
      }
      console.log('');
    }
  } catch (error) {
    spinner.fail('Failed to fetch reviews');
    console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  }
}

function renderReview(review: Review, chalk: typeof import('chalk').default): void {
  const stars = chalk.yellow('★'.repeat(review.rating) + '☆'.repeat(5 - review.rating));
  const date = new Date(review.date).toLocaleDateString();

  console.log(`  ${stars}  ${chalk.bold(review.title || '(No title)')}`);
  console.log(chalk.dim(`  by ${review.author} · ${date}${review.version ? ` · v${review.version}` : ''}`));
  if (review.body) {
    const body = review.body.length > 200 ? review.body.substring(0, 200) + '...' : review.body;
    console.log(`  ${body}`);
  }
  console.log('');
}
