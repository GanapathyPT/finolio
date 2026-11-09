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

