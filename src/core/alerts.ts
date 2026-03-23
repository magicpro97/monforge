import * as fs from 'node:fs';
import * as path from 'node:path';
import { getConfigDir, loadConfig, saveConfig } from './config.js';
import type { AlertRule, AlertViolation, AppStats, RatingSummary } from '../types/index.js';

const ALERTS_FILE = path.join(getConfigDir(), 'alerts.json');

export function loadAlerts(): AlertRule[] {
  const config = loadConfig();
  return config.alerts || [];
}

export function saveAlerts(alerts: AlertRule[]): void {
  const config = loadConfig();
  config.alerts = alerts;
  saveConfig(config);
}

export function addAlert(rule: Omit<AlertRule, 'id' | 'createdAt' | 'enabled'>): AlertRule {
  const alerts = loadAlerts();
  const newRule: AlertRule = {
    ...rule,
    id: `alert-${Date.now()}`,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  alerts.push(newRule);
  saveAlerts(alerts);
  return newRule;
}

export function removeAlert(id: string): boolean {
  const alerts = loadAlerts();
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  alerts.splice(idx, 1);
  saveAlerts(alerts);
  return true;
}

export function parseAlertRule(rule: string): Omit<AlertRule, 'id' | 'createdAt' | 'enabled'> | null {
  // Parse rules like: "crash-rate > 1", "rating < 4.0", "anr-rate >= 0.5"
  const match = rule.match(/^([\w-]+)\s*(>|<|>=|<=|==|!=)\s*([\d.]+)%?$/);
  if (!match) return null;

  const [, metric, operator, thresholdStr] = match;
  const validMetrics = ['crash-rate', 'anr-rate', 'rating', 'error-count', 'review-rating'];

  if (!validMetrics.includes(metric)) return null;

  return {
    name: rule,
    metric: metric as AlertRule['metric'],
    operator: operator as AlertRule['operator'],
    threshold: parseFloat(thresholdStr),
  };
}

export function evaluateAlerts(
  stats: AppStats[],
  ratings: RatingSummary[]
): AlertViolation[] {
  const alerts = loadAlerts().filter((a) => a.enabled);
  const violations: AlertViolation[] = [];

  for (const rule of alerts) {
    let currentValue: number | undefined;

    switch (rule.metric) {
      case 'crash-rate': {
        const avgCrashRate = stats.length > 0
          ? stats.reduce((sum, s) => sum + (100 - s.crashFreeRate), 0) / stats.length
          : 0;
        currentValue = avgCrashRate;
        break;
      }
      case 'anr-rate': {
        const avgAnr = stats.length > 0
          ? stats.reduce((sum, s) => sum + s.anrRate, 0) / stats.length
          : 0;
        currentValue = avgAnr;
        break;
      }
      case 'rating': case 'review-rating': {
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.average, 0) / ratings.length
          : 0;
        currentValue = avgRating;
        break;
      }
      case 'error-count': {
        const totalErrors = stats.reduce((sum, s) => sum + s.totalErrors, 0);
        currentValue = totalErrors;
        break;
      }
    }

    if (currentValue === undefined) continue;

    const violated = evaluateCondition(currentValue, rule.operator, rule.threshold);
    if (violated) {
      violations.push({
        rule,
        currentValue,
        message: `${rule.metric} is ${currentValue.toFixed(2)} (threshold: ${rule.operator} ${rule.threshold})`,
        severity: rule.metric === 'crash-rate' || rule.metric === 'anr-rate' ? 'critical' : 'warning',
      });
    }
  }

  return violations;
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    case '!=': return value !== threshold;
    default: return false;
  }
}
