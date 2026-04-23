# PSD2 Monitor

A transaction monitoring dashboard built to simulate the kind of compliance tooling used by banks and payment processors operating under PSD2 and GDPR in the EEA.

The app ingests synthetic bank transactions, scores them against a set of AML rules, and surfaces flagged activity in a live dashboard. A separate page documents every stored data field with its legal basis, PII classification, retention period, and erasure status. It acts as a lightweight version of the Article 30 record of processing activities required under GDPR.

## Features

- **Transaction feed**: paginated table of all transactions with risk scores and flag reasons
- **Anomaly detection**: rule-based engine flags high-value transfers, off-hours activity, high-risk jurisdictions, suspicious round amounts, and velocity spikes
- **Alert timeline**: live sidebar showing the 10 most recently flagged transactions
- **Date range filtering**: view today, last 7 days, or last 30 days
- **GDPR register**: field-level data inventory with PII classification, retention periods, legal basis, and erasure status
- **Daily automation**: GitHub Actions generates a fresh batch of transactions every morning at 08:00 UTC

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v7, Vite 6 |
| Database | Supabase (PostgreSQL) |
| Anomaly detection | Python |
| Automation | GitHub Actions |
| Hosting | Cloudflare Pages |

## Running Locally

```bash
npm install
```

Create a `.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

Seed the database (backfills 30 days on first run):

```bash
cd scripts
pip install -r requirements.txt
python seed_transactions.py
```

Create a `.env.local` file for the frontend:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

## Anomaly Detection Rules

| Rule | Trigger | Risk Added |
|---|---|---|
| High-value transaction | Amount ≥ €10,000 | +40 |
| Large transaction | Amount ≥ €5,000 | +20 |
| High-risk jurisdiction | Country under EU/UN sanctions | +40 |
| Off-hours activity | Between 01:00 and 05:00 UTC | +15 |
| Suspicious round amount | Round multiples of €500 above €1,000 | +10 |
| Velocity alert | More than 4 transactions from same account in 1 hour | +25 |

Transactions scoring 20 or above are flagged. Scores are capped at 100.

## Deployment

The frontend deploys to Cloudflare Pages. Set the following environment variables in the Pages project settings:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

For the GitHub Actions workflow, add these repository secrets:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
```
