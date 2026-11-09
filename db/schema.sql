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

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_investment     REAL     NOT NULL DEFAULT 0.0,
    current_value        REAL     NOT NULL DEFAULT 0.0,
    total_pnl            REAL     NOT NULL DEFAULT 0.0,
    total_pnl_percentage  REAL     NOT NULL DEFAULT 0.0,
    day_pnl              REAL     NOT NULL DEFAULT 0.0,
    holdings_count       INTEGER  NOT NULL DEFAULT 0,
    snapshot_date        TEXT     NOT NULL, -- YYYY-MM-DD
    created_at           DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user ON portfolio_snapshots(user_id, snapshot_date);
