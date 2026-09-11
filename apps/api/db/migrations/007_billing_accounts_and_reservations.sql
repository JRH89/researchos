CREATE TABLE IF NOT EXISTS billing_accounts (
  owner_uid TEXT PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  subscription_plan TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_reservations (
  id UUID PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(owner_uid) ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('research', 'paper')),
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'settled', 'released', 'expired')),
  provider_cost_usd NUMERIC(12, 6),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  UNIQUE (account_id, reference_type, reference_id)
);
CREATE INDEX IF NOT EXISTS credit_reservations_active_idx ON credit_reservations (account_id, status, expires_at);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
