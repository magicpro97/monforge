import type { DashboardData, AppStats, RatingSummary, ErrorEntry, AlertViolation } from '../types/index.js';
import { loadConfig } from './config.js';
import { evaluateAlerts } from './alerts.js';
import { SentryProvider } from '../providers/sentry.js';
import { CrashlyticsProvider } from '../providers/crashlytics.js';
import { AppStoreProvider } from '../providers/appstore.js';
import { PlayStoreProvider } from '../providers/playstore.js';
import type { MonitoringProvider, ReviewProvider } from '../types/index.js';

export async function collectDashboardData(): Promise<DashboardData> {
  const config = loadConfig();
  const monitoringProviders: MonitoringProvider[] = [];
  const reviewProviders: ReviewProvider[] = [];

  // Initialize monitoring providers
  const sentry = new SentryProvider();
  sentry.configure(config.providers.sentry as unknown as Record<string, string>);
  if (sentry.isConfigured()) monitoringProviders.push(sentry);

  const crashlytics = new CrashlyticsProvider();
  crashlytics.configure(config.providers.crashlytics as unknown as Record<string, string>);
  if (crashlytics.isConfigured()) monitoringProviders.push(crashlytics);

  // Initialize review providers
  const appstore = new AppStoreProvider();
  appstore.configure(config.providers.appstore as unknown as Record<string, string>);
  if (appstore.isConfigured()) reviewProviders.push(appstore);

  const playstore = new PlayStoreProvider();
  playstore.configure(config.providers.playstore as unknown as Record<string, string>);
  if (playstore.isConfigured()) reviewProviders.push(playstore);

  // Collect stats
  const stats: { provider: string; data: AppStats }[] = [];
  for (const p of monitoringProviders) {
    try {
      const data = await p.getStats();
      stats.push({ provider: p.name, data });
    } catch {
      // Skip failed providers
    }
  }

  // Collect errors
  const errors: { provider: string; data: ErrorEntry[] }[] = [];
  for (const p of monitoringProviders) {
    try {
      const data = await p.getErrors(config.defaults.errorLimit);
      errors.push({ provider: p.name, data });
    } catch {
      // Skip failed providers
    }
  }

  // Collect ratings
  const ratings: { provider: string; data: RatingSummary }[] = [];
  for (const p of reviewProviders) {
    try {
      const data = await p.getRatingSummary();
      ratings.push({ provider: p.name, data });
    } catch {
      // Skip failed providers
    }
  }

  // Evaluate alerts
  const allStats = stats.map((s) => s.data);
  const allRatings = ratings.map((r) => r.data);
  const alerts = evaluateAlerts(allStats, allRatings);

  return {
    stats,
    errors,
    ratings,
    alerts,
    timestamp: new Date().toISOString(),
  };
}

export function renderDashboard(data: DashboardData): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  ╔══════════════════════════════════════════════════════╗');
  lines.push('  ║          📊 MonForge — Health Dashboard             ║');
  lines.push('  ╚══════════════════════════════════════════════════════╝');
  lines.push('');

  // Check if any providers are configured
  if (data.stats.length === 0 && data.ratings.length === 0) {
    lines.push('  ⚠  No providers configured. Run:');
    lines.push('');
    lines.push('     monforge config set sentry.authToken <token>');
    lines.push('     monforge config set sentry.orgSlug <org>');
    lines.push('     monforge config set sentry.projectSlug <project>');
    lines.push('');
    lines.push('     monforge config set appstore.appId <id>');
    lines.push('     monforge config set playstore.appId <id>');
    lines.push('');
    return lines.join('\n');
  }

  // App Health Section
  if (data.stats.length > 0) {
    lines.push('  ┌─ Application Health ─────────────────────────────┐');
    for (const s of data.stats) {
      const crashIcon = s.data.crashFreeRate >= 99 ? '🟢' : s.data.crashFreeRate >= 95 ? '🟡' : '🔴';
      lines.push(`  │  ${crashIcon} ${s.provider.padEnd(14)} Crash-free: ${s.data.crashFreeRate.toFixed(2)}%`);
      lines.push(`  │     Users: ${s.data.crashFreeUsersRate.toFixed(2)}%  Crashes: ${s.data.totalCrashes}  ANR: ${s.data.anrRate.toFixed(2)}%`);
    }
    lines.push('  └──────────────────────────────────────────────────┘');
    lines.push('');
  }

  // Ratings Section
  if (data.ratings.length > 0) {
    lines.push('  ┌─ App Store Ratings ──────────────────────────────┐');
    for (const r of data.ratings) {
      const stars = '★'.repeat(Math.round(r.data.average)) + '☆'.repeat(5 - Math.round(r.data.average));
      lines.push(`  │  ${stars} ${r.data.average.toFixed(1)}  ${r.provider} (${r.data.total.toLocaleString()} reviews)`);
    }
    lines.push('  └──────────────────────────────────────────────────┘');
    lines.push('');
  }

  // Top Errors
  if (data.errors.length > 0) {
    lines.push('  ┌─ Top Errors ─────────────────────────────────────┐');
    for (const e of data.errors) {
      lines.push(`  │  ${e.provider}:`);
      e.data.slice(0, 5).forEach((err, i) => {
        const levelIcon = err.level === 'fatal' ? '💀' : err.level === 'error' ? '🔴' : '🟡';
        lines.push(`  │    ${i + 1}. ${levelIcon} ${err.title.substring(0, 40)} (${err.count}x)`);
      });
    }
    lines.push('  └──────────────────────────────────────────────────┘');
    lines.push('');
  }

  // Alert Violations
  if (data.alerts.length > 0) {
    lines.push('  ┌─ 🚨 Alert Violations ────────────────────────────┐');
    for (const v of data.alerts) {
      const icon = v.severity === 'critical' ? '🔴' : v.severity === 'warning' ? '🟡' : 'ℹ️';
      lines.push(`  │  ${icon} ${v.message}`);
    }
    lines.push('  └──────────────────────────────────────────────────┘');
    lines.push('');
  }

  const ts = new Date(data.timestamp).toLocaleString();
  lines.push(`  Last updated: ${ts}`);
  lines.push('');

  return lines.join('\n');
}
