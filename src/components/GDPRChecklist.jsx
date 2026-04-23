import { useEffect, useState } from 'react'
import { getGDPRFields } from '../lib/queries'

export default function GDPRChecklist() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGDPRFields().then(({ data }) => { setFields(data ?? []); setLoading(false) })
  }, [])

  if (loading)       return <div className="state-msg">Loading…</div>
  if (!fields.length) return <div className="state-msg">No fields found — run the seed script first.</div>

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Data Field Register</span>
        <span className="page-info">{fields.length} fields</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Table</th>
              <th>PII</th>
              <th>Legal Basis</th>
              <th>Category</th>
              <th>Retention</th>
              <th>Erasure Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{f.field_name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{f.table_name}</td>
                <td>
                  <span className={`pii-badge ${f.is_pii ? 'pii-yes' : 'pii-no'}`}>
                    {f.is_pii ? 'PII' : 'Non-PII'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160 }}>{f.legal_basis}</td>
                <td style={{ fontSize: 11 }}>{f.data_category}</td>
                <td>
                  <span className="retention-pill">
                    {f.retention_days ? `${Math.round(f.retention_days / 365)}y` : ''}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${f.erasure_status ?? 'compliant'}`}>
                    {f.erasure_status ?? 'compliant'}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 220 }}>{f.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
