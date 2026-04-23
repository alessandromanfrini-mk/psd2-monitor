import { useEffect, useState } from 'react'
import { getStats } from '../lib/queries'
import StatCard from '../components/StatCard'
import TransactionTable from '../components/TransactionTable'
import AlertTimeline from '../components/AlertTimeline'

const RANGES = [
  { label: 'Today',   days: 0 },
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
]

function startOf(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (days > 0) d.setDate(d.getDate() - days)
  return d.toISOString()
}

export default function MonitorPage() {
  const [rangeIdx, setRangeIdx] = useState(2)
  const [stats, setStats] = useState(null)

  const startDate = startOf(RANGES[rangeIdx].days)

  useEffect(() => {
    setStats(null)
    getStats(startDate).then(setStats)
  }, [startDate])

  const flagPct = stats && stats.total > 0
    ? `${((stats.flagged / stats.total) * 100).toFixed(1)}% of total`
    : ''

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Transaction Monitor</div>
          <div className="page-subtitle">Real-time PSD2 compliance &amp; anomaly detection</div>
        </div>
        <div className="date-tabs">
          {RANGES.map((r, i) => (
            <button
              key={i}
              className={`date-tab${i === rangeIdx ? ' active' : ''}`}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Transactions" value={stats?.total?.toLocaleString()} sub={RANGES[rangeIdx].label} />
        <StatCard label="Flagged" value={stats?.flagged?.toLocaleString()} sub={flagPct} color={stats?.flagged > 0 ? 'var(--critical)' : undefined} />
        <StatCard label="High Risk" value={stats?.high_risk?.toLocaleString()} sub="Score ≥ 60" color={stats?.high_risk > 0 ? 'var(--high)' : undefined} />
        <StatCard label="Avg Risk Score" value={stats?.avg_risk} sub="Out of 100" />
      </div>

      <div className="monitor-grid">
        <TransactionTable startDate={startDate} />
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alert Timeline</span>
            <span className="page-info">Latest 10</span>
          </div>
          <AlertTimeline />
        </div>
      </div>
    </div>
  )
}
