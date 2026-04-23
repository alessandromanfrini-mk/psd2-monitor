#!/usr/bin/env python3
"""
Generates synthetic PSD2 transactions, runs rule-based anomaly detection,
and upserts results to Supabase.

First run: backfills 30 days of data.
Subsequent runs (via GitHub Actions cron): inserts today's batch.
"""

from __future__ import annotations

import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from faker import Faker
from supabase import create_client, Client

load_dotenv()

fake = Faker()
rng  = random.Random()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# ── Fixtures ──────────────────────────────────────────────────────────────────

MERCHANTS: list[tuple[str, str, str]] = [
    ("Bónus",            "grocery",       "IS"),
    ("Krónan",           "grocery",       "IS"),
    ("Hagkaup",          "retail",        "IS"),
    ("Samkaup",          "grocery",       "IS"),
    ("Nettó",            "grocery",       "IS"),
    ("Landsbankinn ATM", "atm",           "IS"),
    ("N1",               "fuel",          "IS"),
    ("Olís",             "fuel",          "IS"),
    ("Shell",            "fuel",          "IS"),
    ("Elko",             "tech",          "IS"),
    ("Dominos Iceland",  "restaurant",    "IS"),
    ("Amazon EU",        "online_retail", "DE"),
    ("Apple Store",      "tech",          "IE"),
    ("Booking.com",      "travel",        "NL"),
    ("Airbnb",           "travel",        "US"),
    ("Spotify",          "subscription",  "SE"),
    ("Steam",            "gaming",        "US"),
    ("PayPal Transfer",  "p2p",           "US"),
    ("Alibaba",          "online_retail", "CN"),
    ("Western Union",    "remittance",    "US"),
]

HIGH_RISK = {"RU", "BY", "KP", "IR", "SY"}

ACCOUNTS = [
    "ACC-ISKA-1042", "ACC-ISKA-2187", "ACC-ISKA-3391", "ACC-ISKA-4508",
    "ACC-ARBA-0812", "ACC-ARBA-1563", "ACC-ARBA-2940", "ACC-ARBA-3711",
    "ACC-ISBA-0055", "ACC-ISBA-1177", "ACC-ISBA-3308", "ACC-ISBA-2044",
    "ACC-LAND-0624", "ACC-LAND-1891", "ACC-LAND-2205", "ACC-LAND-3087",
    "ACC-KVIKA-0013", "ACC-KVIKA-0427", "ACC-KVIKA-1985", "ACC-KVIKA-2630",
]

GDPR_FIELDS = [
    {
        "field_name": "account_id", "table_name": "transactions", "is_pii": True,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation (PSD2 Art. 24)", "data_category": "Financial identifier",
        "notes": "Stored as a coded reference with no direct link to a personal name. The account holder's identity is held separately and is not present in this table.",
    },
    {
        "field_name": "amount", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation (PSD2 Art. 24)", "data_category": "Financial data",
        "notes": "On its own this field tells you nothing personal, but paired with an account ID it can identify a real person's spending and must be treated accordingly.",
    },
    {
        "field_name": "merchant", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation", "data_category": "Commercial data", "notes": None,
    },
    {
        "field_name": "country", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation", "data_category": "Geolocation",
        "notes": "Only the country is recorded, not a city or address. Country alone is generally not enough to identify an individual under GDPR.",
    },
    {
        "field_name": "transaction_date", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation (PSD2 Art. 24)", "data_category": "Temporal data", "notes": None,
    },
    {
        "field_name": "currency", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation", "data_category": "Financial data", "notes": None,
    },
    {
        "field_name": "merchant_category", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation", "data_category": "Commercial data",
        "notes": "Think of this as a spending category tag. On its own it is harmless, but alongside an account ID it could reveal sensitive habits and should be treated with care.",
    },
    {
        "field_name": "transaction_type", "table_name": "transactions", "is_pii": False,
        "retention_days": 1825, "erasure_status": "compliant",
        "legal_basis": "Legal obligation", "data_category": "Transactional metadata", "notes": None,
    },
    {
        "field_name": "risk_score", "table_name": "transactions", "is_pii": False,
        "retention_days": 365, "erasure_status": "compliant",
        "legal_basis": "Legitimate interest (fraud prevention)", "data_category": "Derived / analytical",
        "notes": "If this score is ever used to automatically approve or block something, GDPR Article 22 applies and the account holder has the right to request a human review of that decision.",
    },
    {
        "field_name": "flag_reasons", "table_name": "transactions", "is_pii": False,
        "retention_days": 365, "erasure_status": "compliant",
        "legal_basis": "Legitimate interest (fraud prevention)", "data_category": "Derived / analytical",
        "notes": "The specific reasons a transaction was flagged. Kept for a shorter period than the transaction itself since these are derived conclusions rather than original records.",
    },
]

# ── Transaction generation ────────────────────────────────────────────────────

def make_normal(account: str, tx_time: datetime) -> dict[str, Any]:
    merchant, category, country = rng.choice(MERCHANTS)
    return {
        "transaction_date": tx_time.isoformat(),
        "account_id": account, "amount": round(rng.uniform(5, 1500), 2),
        "currency": "EUR", "merchant": merchant, "merchant_category": category,
        "country": country, "transaction_type": rng.choice(["debit", "credit", "transfer"]),
    }


def make_suspicious(account: str, tx_time: datetime) -> dict[str, Any]:
    merchant, category, _ = rng.choice(MERCHANTS)
    variant = rng.randint(0, 3)
    if variant == 0:
        amount, country = float(rng.choice([10000, 15000, 20000, 50000])), "IS"
    elif variant == 1:
        amount, country = round(rng.uniform(200, 5000), 2), rng.choice(sorted(HIGH_RISK))
    elif variant == 2:
        tx_time = tx_time.replace(hour=rng.randint(2, 4), minute=rng.randint(0, 59))
        amount, country = round(rng.uniform(2000, 8000), 2), "IS"
    else:
        amount, country = float(rng.choice([10000, 20000, 50000])), rng.choice(sorted(HIGH_RISK))
    return {
        "transaction_date": tx_time.isoformat(),
        "account_id": account, "amount": amount, "currency": "EUR",
        "merchant": merchant, "merchant_category": category,
        "country": country, "transaction_type": rng.choice(["debit", "credit", "transfer"]),
    }

# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect(tx: dict[str, Any], history: list[dict[str, Any]]) -> tuple[bool, int, list[str]]:
    flags: list[str] = []
    risk = 0
    amount   = float(tx["amount"])
    tx_time  = datetime.fromisoformat(tx["transaction_date"])
    hour     = tx_time.hour

    if amount >= 10000:
        flags.append("High-value transaction (≥ €10,000)"); risk += 40
    elif amount >= 5000:
        flags.append("Large transaction (≥ €5,000)"); risk += 20

    if 1 <= hour <= 5:
        flags.append("Off-hours (01:00–05:00 UTC)"); risk += 15

    if tx["country"] in HIGH_RISK:
        flags.append(f"High-risk jurisdiction ({tx['country']})"); risk += 40

    if amount >= 1000 and amount % 500 == 0:
        flags.append("Suspicious round amount"); risk += 10

    window = tx_time - timedelta(hours=1)
    recent = [t for t in history if datetime.fromisoformat(t["transaction_date"]) >= window]
    if len(recent) >= 4:
        flags.append(f"Velocity alert: {len(recent)+1} transactions in 1h"); risk += 25

    risk = min(risk, 100)
    return risk >= 20, risk, flags

# ── Day generation ────────────────────────────────────────────────────────────

_WEIGHTS = [1,1,1,1,2,3,5,8,10,10,10,9,8,9,9,8,7,6,5,4,3,2,2,1]


def generate_day(date: datetime, n_normal: int = 60, n_susp: int = 8) -> list[dict[str, Any]]:
    day0 = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    txs: list[dict[str, Any]] = []
    for _ in range(n_normal):
        acc  = rng.choice(ACCOUNTS)
        hour = rng.choices(range(24), weights=_WEIGHTS)[0]
        t    = day0 + timedelta(hours=hour, minutes=rng.randint(0,59), seconds=rng.randint(0,59))
        txs.append(make_normal(acc, t))
    for _ in range(n_susp):
        acc = rng.choice(ACCOUNTS)
        t   = day0 + timedelta(hours=rng.randint(0,23), minutes=rng.randint(0,59))
        txs.append(make_suspicious(acc, t))
    txs.sort(key=lambda t: t["transaction_date"])
    per_account: dict[str, list] = {}
    for tx in txs:
        h = per_account.setdefault(tx["account_id"], [])
        tx["is_flagged"], tx["risk_score"], tx["flag_reasons"] = detect(tx, h)
        h.append(tx)
    return txs

# ── Supabase helpers ──────────────────────────────────────────────────────────

def seed_gdpr() -> None:
    r = supabase.table("gdpr_fields").select("id", count="exact").execute()
    if r.count and r.count > 0:
        return
    supabase.table("gdpr_fields").insert(GDPR_FIELDS).execute()
    print(f"  Seeded {len(GDPR_FIELDS)} GDPR field definitions.")

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("PSD2 Monitor — seed script")
    seed_gdpr()
    today = datetime.now(timezone.utc)
    total = supabase.table("transactions").select("id", count="exact").execute().count or 0
    if total == 0:
        print("No data found — backfilling 30 days…")
        for d in range(29, -1, -1):
            target = today - timedelta(days=d)
            txs = generate_day(target)
            supabase.table("transactions").insert(txs).execute()
            print(f"  {target.date()}: {len(txs)} transactions")
    else:
        txs = generate_day(today)
        supabase.table("transactions").insert(txs).execute()
        print(f"  {today.date()}: {len(txs)} transactions inserted.")

if __name__ == "__main__":
    main()
