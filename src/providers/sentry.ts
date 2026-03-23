import type { MonitoringProvider, ErrorEntry, AppStats } from '../types/index.js';

const SENTRY_API = 'https://sentry.io/api/0';

export class SentryProvider implements MonitoringProvider {
  name = 'Sentry';
  private authToken = '';
  private orgSlug = '';
  private projectSlug = '';

  configure(config: Record<string, string>): void {
    this.authToken = config.authToken || '';
    this.orgSlug = config.orgSlug || '';
    this.projectSlug = config.projectSlug || '';
  }

  isConfigured(): boolean {
    return !!(this.authToken && this.orgSlug && this.projectSlug);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getErrors(limit: number): Promise<ErrorEntry[]> {
    if (!this.isConfigured()) return [];

    const url = `${SENTRY_API}/projects/${this.orgSlug}/${this.projectSlug}/issues/?limit=${limit}&sort=freq`;

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    const issues = (await response.json()) as Array<{
      id: string;
      title: string;
      culprit: string;
      count: string;
      userCount: number;
      firstSeen: string;
      lastSeen: string;
      level: string;
      platform: string;
    }>;

    return issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      culprit: issue.culprit || '',
      count: parseInt(issue.count, 10),
      userCount: issue.userCount || 0,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      level: (issue.level || 'error') as ErrorEntry['level'],
      platform: issue.platform || 'unknown',
    }));
  }

  async getStats(): Promise<AppStats> {
    if (!this.isConfigured()) {
      throw new Error('Sentry is not configured');
    }

    const url = `${SENTRY_API}/projects/${this.orgSlug}/${this.projectSlug}/stats/?stat=received&resolution=1d&since=${Math.floor(Date.now() / 1000) - 86400 * 7}`;

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    const statsData = (await response.json()) as Array<[number, number]>;
    const totalErrors = statsData.reduce((sum, [, count]) => sum + count, 0);

    // Fetch crash-free rate from sessions
    let crashFreeRate = 99.5;
    let crashFreeUsersRate = 99.5;
    try {
      const sessionsUrl = `${SENTRY_API}/organizations/${this.orgSlug}/sessions/?project=${this.projectSlug}&field=crash_free_rate&field=crash_free_users&statsPeriod=7d`;
      const sessionsRes = await fetch(sessionsUrl, { headers: this.headers() });
      if (sessionsRes.ok) {
        const sessions = (await sessionsRes.json()) as {
          groups: Array<{
            totals: { 'crash_free_rate(session)': number; 'crash_free_rate(user)': number };
          }>;
        };
        if (sessions.groups?.[0]) {
          crashFreeRate = (sessions.groups[0].totals['crash_free_rate(session)'] ?? 0.995) * 100;
          crashFreeUsersRate = (sessions.groups[0].totals['crash_free_rate(user)'] ?? 0.995) * 100;
        }
      }
    } catch {
      // Fall back to defaults
    }

    return {
      crashFreeRate,
      crashFreeUsersRate,
      totalCrashes: Math.round(totalErrors * (1 - crashFreeRate / 100)),
      totalErrors,
      anrRate: 0, // Sentry doesn't track ANR natively
      affectedUsers: 0,
      totalUsers: 0,
      period: '7d',
    };
  }
}
