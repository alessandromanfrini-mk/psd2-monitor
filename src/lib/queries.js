import { supabase } from './supabase'

export async function getStats(startDate) {
  const { data } = await supabase.rpc('get_transaction_stats', {
    start_date: startDate,
    end_date: new Date().toISOString(),
  })
  if (!data) return null
  return {
    total:     Number(data.total),
    flagged:   Number(data.flagged),
    high_risk: Number(data.high_risk),
    avg_risk:  Number(data.avg_risk),
  }
}

export async function getTransactions({ page = 0, pageSize = 20, flaggedOnly = false, minRisk = 0, startDate } = {}) {
  let q = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (startDate)    q = q.gte('transaction_date', startDate)
  if (flaggedOnly)  q = q.eq('is_flagged', true)
  if (minRisk > 0)  q = q.gte('risk_score', minRisk)

  return q
}

export async function getAlerts(limit = 10) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_flagged', true)
    .order('transaction_date', { ascending: false })
    .limit(limit)
  return { data }
}

export async function getGDPRFields() {
  return supabase
    .from('gdpr_fields')
    .select('*')
    .order('table_name')
    .order('field_name')
}
