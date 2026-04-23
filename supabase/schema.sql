create extension if not exists "uuid-ossp";

create table if not exists transactions (
  id               uuid          default uuid_generate_v4() primary key,
  created_at       timestamptz   default now(),
  transaction_date timestamptz   not null,
  account_id       text          not null,
  amount           numeric(12,2) not null,
  currency         text          not null default 'EUR',
  merchant         text          not null,
  merchant_category text         not null,
  country          text          not null,
  transaction_type text          not null,
  is_flagged       boolean       default false,
  risk_score       integer       default 0,
  flag_reasons     text[]        default '{}'::text[]
);

create index if not exists idx_tx_date    on transactions (transaction_date desc);
create index if not exists idx_tx_flagged on transactions (is_flagged) where is_flagged = true;
create index if not exists idx_tx_account on transactions (account_id);
create index if not exists idx_tx_risk    on transactions (risk_score desc);

create table if not exists gdpr_fields (
  id             uuid    default uuid_generate_v4() primary key,
  field_name     text    not null,
  table_name     text    not null,
  is_pii         boolean default false,
  retention_days integer,
  erasure_status text    default 'compliant',
  legal_basis    text,
  data_category  text,
  notes          text
);

alter table transactions enable row level security;
alter table gdpr_fields  enable row level security;

create policy "anon read transactions"      on transactions for select using (true);
create policy "anon read gdpr_fields"       on gdpr_fields  for select using (true);
create policy "service insert transactions" on transactions for insert with check (true);
create policy "service insert gdpr_fields"  on gdpr_fields  for insert with check (true);

create or replace function get_transaction_stats(start_date timestamptz, end_date timestamptz)
returns json language sql security definer as $$
  select json_build_object(
    'total',     count(*),
    'flagged',   count(*) filter (where is_flagged),
    'high_risk', count(*) filter (where risk_score >= 60),
    'avg_risk',  round(avg(risk_score)::numeric, 1)
  )
  from transactions
  where transaction_date >= start_date
    and transaction_date <  end_date;
$$;
