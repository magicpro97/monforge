# 📊 MonForge - Production Monitoring CLI

Unified production monitoring dashboard for Sentry, Crashlytics, App Store reviews, and Google Play — all in your terminal.

## Features

- **4 Providers**: Sentry, Firebase Crashlytics, App Store Connect, Google Play Developer API
- **Unified Dashboard**: Crash rates, ANR, error counts, ratings in one view
- **Error Explorer**: Top errors/crashes sorted by frequency and impact
- **Review Viewer**: Browse app store reviews by platform (iOS/Android)
- **Custom Alerts**: Set threshold rules for crash rates, ratings, ANR
- **Health Reports**: Generate markdown or plain text reports
- **Easy Config**: Simple key-value provider configuration stored at `~/.monforge/`

## Quick Start

```bash
# Install globally
npm install -g monforge

# Configure Sentry
monforge config set sentry.authToken <your-sentry-token>
monforge config set sentry.orgSlug <your-org>
monforge config set sentry.projectSlug <your-project>

# View health dashboard
monforge status
```

## Commands

### Status Dashboard

```bash
# Unified health view (crash rate, ANR, ratings, errors)
monforge status
```

### Errors

```bash
# List top errors from all monitoring providers
monforge errors

# Limit results
monforge errors --limit 5
```

### Reviews

```bash
# All reviews
monforge reviews

# Platform-specific
monforge reviews ios
monforge reviews android
```

### Alerts

```bash
# Set alert rules
monforge alerts set "crash-rate > 1"
monforge alerts set "rating < 4.0"
monforge alerts set "anr-rate >= 0.5"

# List active rules
monforge alerts list

# Remove a rule
monforge alerts remove <rule-id>
```

### Reports

```bash
# Generate markdown report
monforge report

# Plain text format
monforge report --format txt

# Save to file
monforge report --output health-report.md
```

### Configuration

```bash
# Sentry
monforge config set sentry.authToken <token>
monforge config set sentry.orgSlug <org>
monforge config set sentry.projectSlug <project>

# Firebase Crashlytics
monforge config set crashlytics.projectId <project-id>
monforge config set crashlytics.authToken <token>

# App Store Connect
monforge config set appstore.appId <app-id>

# Google Play
monforge config set playstore.appId <package-name>
monforge config set playstore.authToken <token>

# View config
monforge config list
monforge config get sentry.orgSlug
```

## Providers

| Provider | Data | Config Required |
|----------|------|----------------|
| **Sentry** | Errors, crash-free rate, issue tracking | `authToken`, `orgSlug`, `projectSlug` |
| **Crashlytics** | Crashes, ANR, crash-free users | `projectId`, `authToken` |
| **App Store** | iOS reviews, ratings | `appId` |
| **Google Play** | Android reviews, ratings | `appId`, `authToken` |

## Alert Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| `crash-rate` | Crash rate percentage | `crash-rate > 1` |
| `anr-rate` | ANR rate percentage | `anr-rate >= 0.5` |
| `rating` | Average app rating | `rating < 4.0` |
| `error-count` | Total error count | `error-count > 1000` |
| `review-rating` | Review rating average | `review-rating < 3.5` |

## Requirements

- Node.js 20+

## License

MIT
