import { useEffect, useState } from 'react'
import { getTransactions } from '../lib/queries'
import RiskBadge from './RiskBadge'

const PAGE_SIZE = 20

const fmtDate = iso => new Date(iso).toLocaleString('en-IS', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

const fmtAmt = (amount, currency) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount)

const flag = code => {
  if (!code || code.length !== 2) return '🌐'
  const o = 0x1F1E6
  return String.fromCodePoint(o + code.charCodeAt(0) - 65) +
         String.fromCodePoint(o + code.charCodeAt(1) - 65)
}

const RISK_OPTS = [
  { label: 'All risks', value: 0 },
  { label: 'Medium+ (≥20)', value: 20 },
  { label: 'High+ (≥50)', value: 50 },
  { label: 'Critical (≥80)', value: 80 },
]

export default function TransactionTable({ startDate }) {
  const [txs, setTxs]         = useState([])
  const [count, setCount]     = useState(0)
  const [page, setPage]       = useState(0)
  const [flaggedOnly, setFO]  = useState(false)
  const [minRisk, setMinRisk] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTransactions({ page, pageSize: PAGE_SIZE, flaggedOnly, minRisk, startDate }).then(
      ({ data, count: total }) => {
        if (cancelled) return
        setTxs(data ?? [])
        setCount(total ?? 0)
        setLoading(false)
      }
    )
    return () => { cancelled = true }
  }, [page, flaggedOnly, minRisk, startDate])

  // reset to page 0 on filter change
  useEffect(() => { setPage(0) }, [flaggedOnly, minRisk, startDate])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Transactions</span>
        <span className="page-info">{count.toLocaleString()} total</span>
      </div>

      <div className="filter-bar">
        <label className="toggle-label">
          <input type="checkbox" checked={flaggedOnly} onChange={e => setFO(e.target.checked)} />
          Flagged only
        </label>
        <select className="filter-select" value={minRisk} onChange={e => setMinRisk(Number(e.target.value))}>
          {RISK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="state-msg">Loading…</div>
        ) : !txs.length ? (
          <div className="state-msg">No transactions match the current filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Account</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Country</th>
                <th>Risk</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 11 }}>
                    {fmtDate(tx.transaction_date)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {tx.is_flagged && <span className="flagged-dot" />}
                    {tx.account_id}
                  </td>
                  <td>{tx.merchant}</td>
                  <td><span className="cat-tag">{tx.merchant_category}</span></td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmtAmt(tx.amount, tx.currency)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{flag(tx.country)} {tx.country}</td>
                  <td><RiskBadge score={tx.risk_score} /></td>
                  <td>{tx.flag_reasons?.map((r, i) => <span key={i} className="flag-tag">{r}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">Page {page + 1} of {totalPages}</span>
          <button className="btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <button className="btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  )
}
