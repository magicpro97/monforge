import type { MonitoringProvider, ErrorEntry, AppStats } from '../types/index.js';

export class CrashlyticsProvider implements MonitoringProvider {
  name = 'Crashlytics';
  private projectId = '';
  private authToken = '';

  configure(config: Record<string, string>): void {
    this.projectId = config.projectId || '';
    this.authToken = config.authToken || '';
  }

  isConfigured(): boolean {
    return !!(this.projectId && this.authToken);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getErrors(limit: number): Promise<ErrorEntry[]> {
    if (!this.isConfigured()) return [];

    // Firebase Crashlytics REST API (via Google Cloud)
    const url = `https://firebasecrashlytics.googleapis.com/v1beta1/projects/${this.projectId}/issues?pageSize=${limit}&orderBy=eventCount desc`;

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Crashlytics API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      issues?: Array<{
        name: string;
        title: string;
        subtitle: string;
        eventCount: string;
        userCount: string;
        firstSeenTime: string;
        lastSeenTime: string;
        type: string;
      }>;
    };

    return (data.issues || []).map((issue) => ({
      id: issue.name,
      title: issue.title || 'Unknown',
      culprit: issue.subtitle || '',
      count: parseInt(issue.eventCount || '0', 10),
      userCount: parseInt(issue.userCount || '0', 10),
      firstSeen: issue.firstSeenTime || '',
      lastSeen: issue.lastSeenTime || '',
      level: issue.type === 'FATAL' ? 'fatal' as const : 'error' as const,
      platform: 'android',
    }));
  }

  async getStats(): Promise<AppStats> {
    if (!this.isConfigured()) {
      throw new Error('Crashlytics is not configured');
    }

    // Firebase Quality Metrics API
    const url = `https://firebasecrashlytics.googleapis.com/v1beta1/projects/${this.projectId}:getQualityMetrics?statsPeriod=7d`;

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Crashlytics API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      crashFreeSessionsPercentage?: number;
      crashFreeUsersPercentage?: number;
      crashCount?: number;
      errorCount?: number;
      anrRate?: number;
      impactedUsersCount?: number;
      totalUsersCount?: number;
    };

    return {
      crashFreeRate: data.crashFreeSessionsPercentage ?? 99.5,
      crashFreeUsersRate: data.crashFreeUsersPercentage ?? 99.5,
      totalCrashes: data.crashCount ?? 0,
      totalErrors: data.errorCount ?? 0,
      anrRate: data.anrRate ?? 0,
      affectedUsers: data.impactedUsersCount ?? 0,
      totalUsers: data.totalUsersCount ?? 0,
      period: '7d',
    };
  }
}
