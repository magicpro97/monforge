---
applyTo: "**/*.ts"
---

# MonForge Development Instructions

This is the **MonForge CLI** project — a unified production monitoring tool that aggregates Sentry errors, Firebase Crashlytics crashes, App Store reviews, and Google Play ratings into a terminal dashboard.

## Architecture

### Providers (`src/providers/`)
- `base.ts` — Abstract base provider class with required methods
- `sentry.ts` — Sentry error tracking provider (REST API)
- `crashlytics.ts` — Firebase Crashlytics crash reporting provider
- `appstore.ts` — Apple App Store review/rating provider
- `playstore.ts` — Google Play Store review/rating provider
- `index.ts` — Provider registry and factory

### Core (`src/core/`)
- `config.ts` — Config management at `~/.monforge/config.json`
- `dashboard.ts` — Unified status dashboard aggregation
- `alerts.ts` — Alert rule management and evaluation
- `report.ts` — Health report generation (Markdown/text)

### CLI Commands (`src/cli/commands/`)
- `status.ts` — Unified health dashboard view
- `errors.ts` — List top errors from all providers
- `reviews.ts` — View app store reviews (iOS/Android)
- `alerts.ts` — Set/list/remove alert rules
- `report.ts` — Generate monitoring report
- `config.ts` — Provider credential management

### Types (`src/types/`)
- `index.ts` — TypeScript interfaces for errors, reviews, alerts, config

## Adding a New Provider

1. Create `src/providers/<name>.ts` extending the base provider class
2. Implement required methods: `getErrors()`, `getStatus()`, `getReviews()` (as applicable)
3. Register in `src/providers/index.ts` provider registry
4. Add default config entry in `src/core/config.ts`

## Adding a New Command

1. Create `src/cli/commands/<name>.ts` exporting a `create<Name>Command()` function returning a Commander `Command`
2. Register in `src/index.ts` with `program.addCommand()`
3. Use the spinner + try/catch error handling pattern

## Adding a New Alert Metric

1. Define the metric name and evaluation logic in `src/core/alerts.ts`
2. Add the metric to the available metrics documentation
3. Ensure the metric is populated from the relevant provider

## Conventions

- ESM modules (`"type": "module"` in package.json)
- All imports use `.js` extension (TypeScript ESM requirement)
- Dynamic imports for chalk/ora (ESM-only packages): `const chalk = (await import('chalk')).default`
- Node.js 20+ required
- No external HTTP dependencies — use built-in `fetch`
- Provider registry pattern: `Map<string, () => Provider>` for lazy instantiation
- Alert rules stored within the main config file

## Build & Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript (tsc)
npm run dev          # Build and run
node dist/index.js   # Run CLI directly
```

## Testing

```bash
npm run build
node dist/index.js --version
node dist/index.js --help
node dist/index.js status --help
node dist/index.js errors --help
node dist/index.js reviews --help
node dist/index.js alerts --help
node dist/index.js report --help
```

## CI/CD

- GitHub CI builds on push (`.github/workflows/ci.yml`)
- npm publish is automatic via GitHub Release (`.github/workflows/publish.yml`)
- NPM_TOKEN stored as GitHub repo secret — never commit tokens
