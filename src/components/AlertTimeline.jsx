import { useEffect, useState } from 'react'
import { getAlerts } from '../lib/queries'
import RiskBadge from './RiskBadge'

const fmt = iso => new Date(iso).toLocaleString('en-IS', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

const fmtAmt = (amount, currency) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount)

export default function AlertTimeline() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlerts(10).then(({ data }) => { setAlerts(data ?? []); setLoading(false) })
  }, [])

  if (loading)       return <div className="state-msg">Loading…</div>
  if (!alerts.length) return <div className="state-msg">No alerts</div>

  return (
    <div className="timeline">
      {alerts.map(tx => (
        <div key={tx.id} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-time">{fmt(tx.transaction_date)}</div>
          <div className="timeline-main">
            <span className="flagged-dot" />{tx.account_id}
          </div>
          <div className="timeline-sub">{tx.merchant} · {tx.country}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span className="timeline-amount">{fmtAmt(tx.amount, tx.currency)}</span>
            <RiskBadge score={tx.risk_score} />
          </div>
          {tx.flag_reasons?.[0] && (
            <div style={{ marginTop: 4 }}>
              <span className="flag-tag">{tx.flag_reasons[0]}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
