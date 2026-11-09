-- name: DeleteHoldingsByUserID :exec
DELETE FROM holdings
WHERE user_id = ?;

-- name: InsertHolding :one
INSERT INTO holdings (
    user_id,
    tradingsymbol,
    exchange,
    instrument_token,
    isin,
    product,
    price,
    quantity,
    t1_quantity,
    realised_quantity,
    authorised_quantity,
    opening_quantity,
    collateral_quantity,
    collateral_type,
    average_price,
    last_price,
    close_price,
    pnl,
    day_change,
    day_change_percentage,
    discrepancy,
    synced_at
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: GetHoldingsByUserID :many
SELECT * FROM holdings
WHERE user_id = ?
ORDER BY (quantity * last_price) DESC;

-- name: DeleteMFHoldingsByUserID :exec
DELETE FROM mf_holdings
WHERE user_id = ?;

-- name: InsertMFHolding :one
INSERT INTO mf_holdings (
    user_id,
    folio,
    fund,
    tradingsymbol,
    average_price,
    last_price,
    last_price_date,
    pnl,
    quantity,
    synced_at
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: GetMFHoldingsByUserID :many
SELECT * FROM mf_holdings
WHERE user_id = ?
ORDER BY (quantity * last_price) DESC;

-- name: InsertPortfolioSnapshot :one
INSERT INTO portfolio_snapshots (
    user_id,
    status,
    error_message,
    equity_investment,
    equity_current_value,
    equity_pnl,
    equity_count,
    mf_investment,
    mf_current_value,
    mf_pnl,
    mf_count,
    total_investment,
    current_value,
    total_pnl,
    total_pnl_percentage,
    day_pnl,
    snapshot_date,
    created_at
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: GetLatestSuccessfulPortfolioSnapshot :one
SELECT * FROM portfolio_snapshots
WHERE user_id = ? AND status = 'success'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLatestPortfolioSnapshot :one
SELECT * FROM portfolio_snapshots
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 1;

-- name: ListPortfolioSnapshotsByUserID :many
SELECT * FROM portfolio_snapshots
WHERE user_id = ?
ORDER BY created_at ASC
LIMIT ?;
