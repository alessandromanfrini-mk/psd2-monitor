import { useEffect, useState } from 'react'
import { getGDPRFields } from '../lib/queries'
import StatCard from '../components/StatCard'
import GDPRChecklist from '../components/GDPRChecklist'

export default function GDPRPage() {
  const [summary, setSummary] = useState({ total: 0, pii: 0, compliant: 0 })

  useEffect(() => {
    getGDPRFields().then(({ data }) => {
      if (!data) return
      setSummary({
        total:     data.length,
        pii:       data.filter(f => f.is_pii).length,
        compliant: data.filter(f => f.erasure_status === 'compliant').length,
      })
    })
  }, [])

  const compliancePct = summary.total
    ? `${Math.round((summary.compliant / summary.total) * 100)}% compliance rate`
    : ''

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">GDPR Data Register</div>
          <div className="page-subtitle">
            Article 30 record of processing activities — field-level PII classification,
            legal basis, retention periods, and erasure status.
          </div>
        </div>
      </div>

      <div className="gdpr-summary">
        <StatCard label="Total Fields" value={summary.total} sub="Across all tables" />
        <StatCard label="PII Fields" value={summary.pii} sub="Require GDPR controls" color={summary.pii > 0 ? 'var(--high)' : undefined} />
        <StatCard label="Compliant" value={summary.compliant} sub={compliancePct} color="var(--low)" />
      </div>

      <GDPRChecklist />
    </div>
  )
}
