-- name: CountGoalsByUserID :one
SELECT COUNT(*) FROM goals
WHERE user_id = ?;

-- name: ListGoalsByUserID :many
SELECT * FROM goals
WHERE user_id = ?
ORDER BY parent_id ASC NULLS FIRST, created_at ASC;

-- name: GetGoalByID :one
SELECT * FROM goals
WHERE id = ? AND user_id = ?;

-- name: CreateGoal :one
INSERT INTO goals (
    user_id,
    parent_id,
    title,
    description,
    target_amount,
    target_date
) VALUES (
    ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: UpdateGoal :one
UPDATE goals
SET parent_id = ?,
    title = ?,
    description = ?,
    target_amount = ?,
    target_date = ?,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = ? AND user_id = ?
RETURNING *;

-- name: DeleteGoal :exec
DELETE FROM goals
WHERE id = ? AND user_id = ?;

-- name: ListGoalAssetsByUserID :many
SELECT * FROM goal_assets
WHERE user_id = ?;

-- name: AssignAssetToGoal :one
INSERT INTO goal_assets (
    user_id,
    goal_id,
    asset_type,
    asset_key,
    created_at
) VALUES (
    ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(user_id, asset_type, asset_key) DO UPDATE SET
    goal_id = excluded.goal_id,
    created_at = excluded.created_at
RETURNING *;

-- name: UnassignAssetFromGoal :exec
DELETE FROM goal_assets
WHERE user_id = ? AND asset_type = ? AND asset_key = ?;

