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

-- name: GetAssetAllocations :many
SELECT * FROM goal_assets
WHERE user_id = ? AND asset_type = ? AND asset_key = ?;

-- name: AssignAssetToGoal :one
INSERT INTO goal_assets (
    user_id,
    goal_id,
    asset_type,
    asset_key,
    allocation_percentage,
    created_at
) VALUES (
    ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(user_id, goal_id, asset_type, asset_key) DO UPDATE SET
    allocation_percentage = excluded.allocation_percentage,
    created_at = excluded.created_at
RETURNING *;

-- name: UnassignAssetFromGoal :exec
DELETE FROM goal_assets
WHERE user_id = ? AND goal_id = ? AND asset_type = ? AND asset_key = ?;

-- name: UnassignAssetFromAllGoals :exec
DELETE FROM goal_assets
WHERE user_id = ? AND asset_type = ? AND asset_key = ?;

