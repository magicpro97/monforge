// ── Provider Interfaces ──

export interface ErrorEntry {
  id: string;
  title: string;
  culprit: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  level: 'fatal' | 'error' | 'warning' | 'info';
  platform: string;
}

export interface AppStats {
  crashFreeRate: number;
  crashFreeUsersRate: number;
  totalCrashes: number;
  totalErrors: number;
  anrRate: number;
  affectedUsers: number;
  totalUsers: number;
  period: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  version: string;
  date: string;
  platform: 'ios' | 'android';
  language: string;
}

export interface RatingSummary {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  platform: 'ios' | 'android';
}

export interface MonitoringProvider {
  name: string;
  configure(config: Record<string, string>): void;
  isConfigured(): boolean;
  getErrors(limit: number): Promise<ErrorEntry[]>;
  getStats(): Promise<AppStats>;
}

export interface ReviewProvider {
  name: string;
  configure(config: Record<string, string>): void;
  isConfigured(): boolean;
  getReviews(limit: number): Promise<Review[]>;
  getRatingSummary(): Promise<RatingSummary>;
}

// ── Config Types ──

export interface ProviderConfig {
  enabled: boolean;
  authToken?: string;
  orgSlug?: string;
  projectSlug?: string;
  projectId?: string;
  appId?: string;
  keyFilePath?: string;
  [key: string]: string | boolean | undefined;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'crash-rate' | 'anr-rate' | 'rating' | 'error-count' | 'review-rating';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  provider?: string;
  enabled: boolean;
  createdAt: string;
}

export interface AlertViolation {
  rule: AlertRule;
  currentValue: number;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface MonForgeConfig {
  providers: {
    sentry: ProviderConfig;
    crashlytics: ProviderConfig;
    appstore: ProviderConfig;
    playstore: ProviderConfig;
  };
  defaults: {
    errorLimit: number;
    reviewLimit: number;
    reportFormat: 'md' | 'txt';
  };
  alerts: AlertRule[];
}

// ── Dashboard Types ──

export interface DashboardData {
  stats: {
    provider: string;
    data: AppStats;
  }[];
  errors: {
    provider: string;
    data: ErrorEntry[];
  }[];
  ratings: {
    provider: string;
    data: RatingSummary;
  }[];
  alerts: AlertViolation[];
  timestamp: string;
}
