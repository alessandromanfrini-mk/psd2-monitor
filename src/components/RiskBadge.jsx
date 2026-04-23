export default function RiskBadge({ score }) {
  let cls, label
  if (score >= 80)      { cls = 'critical'; label = 'Critical' }
  else if (score >= 50) { cls = 'high';     label = 'High' }
  else if (score >= 20) { cls = 'medium';   label = 'Medium' }
  else                  { cls = 'low';      label = 'Low' }
  return <span className={`risk-badge risk-${cls}`}>{score} · {label}</span>
}
