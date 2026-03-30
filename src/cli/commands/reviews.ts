import { loadConfig } from '../../core/config.js';
import { analyzeSentiment, summarizeSentiments } from '../../core/sentiment.js';
import { AppStoreProvider } from '../../providers/appstore.js';
import { PlayStoreProvider } from '../../providers/playstore.js';
import type { Review, ReviewProvider } from '../../types/index.js';
import type { SentimentResult } from '../../core/sentiment.js';

export interface ReviewsOptions {
  sentiment?: boolean;
}

export async function reviewsCommand(platform: string, options: ReviewsOptions = {}): Promise<void> {
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
        const sentimentResults: SentimentResult[] = [];

        for (const review of reviews) {
          if (options.sentiment) {
            const text = [review.title, review.body].filter(Boolean).join(' ');
            const result = analyzeSentiment(text);
            sentimentResults.push(result);
            renderReviewWithSentiment(review, result, chalk);
          } else {
            renderReview(review, chalk);
          }
        }

        if (options.sentiment && sentimentResults.length > 0) {
          const summaryData = summarizeSentiments(sentimentResults);
          console.log(chalk.bold('  📊 Sentiment Summary'));
          console.log('');
          console.log(`  ${chalk.green('🟢 Positive:')} ${summaryData.positive}  ${chalk.red('🔴 Negative:')} ${summaryData.negative}  ${chalk.dim('⚪ Neutral:')} ${summaryData.neutral}`);
          console.log(chalk.dim(`  Average sentiment: ${summaryData.averageSentiment.toFixed(2)}`));

          if (summaryData.topComplaints.length > 0) {
            console.log('');
            console.log(chalk.bold('  🔴 Top Complaints:'));
            for (const c of summaryData.topComplaints) {
              console.log(chalk.red(`    ${c.word} (${c.count})`));
            }
          }

          if (summaryData.topPraises.length > 0) {
            console.log('');
            console.log(chalk.bold('  🟢 Top Praises:'));
            for (const p of summaryData.topPraises) {
              console.log(chalk.green(`    ${p.word} (${p.count})`));
            }
          }
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

function renderReviewWithSentiment(
  review: Review,
  result: SentimentResult,
  chalk: typeof import('chalk').default,
): void {
  const stars = chalk.yellow('★'.repeat(review.rating) + '☆'.repeat(5 - review.rating));
  const date = new Date(review.date).toLocaleDateString();

  const sentimentIcon = result.sentiment === 'positive' ? '🟢'
    : result.sentiment === 'negative' ? '🔴'
    : '⚪';

  console.log(`  ${sentimentIcon} ${stars}  ${chalk.bold(review.title || '(No title)')}`);
  console.log(chalk.dim(`  by ${review.author} · ${date}${review.version ? ` · v${review.version}` : ''}`));
  if (review.body) {
    const body = review.body.length > 200 ? review.body.substring(0, 200) + '...' : review.body;
    console.log(`  ${body}`);
  }
  console.log('');
}
