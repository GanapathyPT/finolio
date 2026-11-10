CREATE TABLE IF NOT EXISTS users (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    kite_id     TEXT     NOT NULL UNIQUE,
    user_name   TEXT     NOT NULL,
    email       TEXT     NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS kite_sessions (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token  TEXT     NOT NULL,
    public_token  TEXT     NOT NULL,
    login_time    DATETIME NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS holdings (
    id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tradingsymbol         TEXT     NOT NULL,
    exchange              TEXT     NOT NULL,
    instrument_token      INTEGER  NOT NULL,
    isin                  TEXT     NOT NULL,
    product               TEXT     NOT NULL,
    price                 REAL     NOT NULL DEFAULT 0.0,
    quantity              INTEGER  NOT NULL DEFAULT 0,
    t1_quantity           INTEGER  NOT NULL DEFAULT 0,
    realised_quantity     INTEGER  NOT NULL DEFAULT 0,
    authorised_quantity   INTEGER  NOT NULL DEFAULT 0,
    opening_quantity      INTEGER  NOT NULL DEFAULT 0,
    collateral_quantity   INTEGER  NOT NULL DEFAULT 0,
    collateral_type       TEXT     NOT NULL DEFAULT '',
    average_price         REAL     NOT NULL DEFAULT 0.0,
    last_price            REAL     NOT NULL DEFAULT 0.0,
    close_price           REAL     NOT NULL DEFAULT 0.0,
    pnl                   REAL     NOT NULL DEFAULT 0.0,
    day_change            REAL     NOT NULL DEFAULT 0.0,
    day_change_percentage REAL     NOT NULL DEFAULT 0.0,
    discrepancy           INTEGER  NOT NULL DEFAULT 0,
    synced_at             DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(user_id, tradingsymbol, exchange)
);

CREATE TABLE IF NOT EXISTS mf_holdings (
    id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folio           TEXT     NOT NULL,
    fund            TEXT     NOT NULL,
    tradingsymbol   TEXT     NOT NULL,
    average_price   REAL     NOT NULL DEFAULT 0.0,
    last_price      REAL     NOT NULL DEFAULT 0.0,
    last_price_date TEXT     NOT NULL DEFAULT '',
    pnl             REAL     NOT NULL DEFAULT 0.0,
    quantity        REAL     NOT NULL DEFAULT 0.0,
    synced_at       DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(user_id, folio, fund)
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status                TEXT     NOT NULL DEFAULT 'success', -- 'success' or 'failed'
    error_message         TEXT     NOT NULL DEFAULT '',
    equity_investment     REAL     NOT NULL DEFAULT 0.0,
    equity_current_value  REAL     NOT NULL DEFAULT 0.0,
    equity_pnl            REAL     NOT NULL DEFAULT 0.0,
    equity_count          INTEGER  NOT NULL DEFAULT 0,
    mf_investment         REAL     NOT NULL DEFAULT 0.0,
    mf_current_value      REAL     NOT NULL DEFAULT 0.0,
    mf_pnl                REAL     NOT NULL DEFAULT 0.0,
    mf_count              INTEGER  NOT NULL DEFAULT 0,
    total_investment      REAL     NOT NULL DEFAULT 0.0,
    current_value         REAL     NOT NULL DEFAULT 0.0,
    total_pnl             REAL     NOT NULL DEFAULT 0.0,
    total_pnl_percentage   REAL     NOT NULL DEFAULT 0.0,
    day_pnl               REAL     NOT NULL DEFAULT 0.0,
    snapshot_date         TEXT     NOT NULL, -- YYYY-MM-DD
    created_at            DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id      INTEGER  NULL REFERENCES goals(id) ON DELETE CASCADE,
    title          TEXT     NOT NULL,
    description    TEXT     NOT NULL DEFAULT '',
    target_amount  REAL     NULL,
    target_date    TEXT     NULL,
    created_at     DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at     DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS goal_assets (
    id                    INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id               INTEGER  NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    asset_type            TEXT     NOT NULL CHECK(asset_type IN ('equity', 'mf')),
    asset_key             TEXT     NOT NULL,
    allocation_percentage INTEGER  NOT NULL DEFAULT 100 CHECK(allocation_percentage >= 10 AND allocation_percentage <= 100 AND allocation_percentage % 10 = 0),
    created_at            DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(user_id, goal_id, asset_type, asset_key)
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_mf_holdings_user ON mf_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user ON portfolio_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_id);
CREATE INDEX IF NOT EXISTS idx_goal_assets_user_goal ON goal_assets(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_assets_user_asset ON goal_assets(user_id, asset_type, asset_key);
