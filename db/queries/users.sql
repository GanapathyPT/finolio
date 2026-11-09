-- name: UpsertUser :one
INSERT INTO users (kite_id, user_name, email, updated_at)
VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT (kite_id) DO UPDATE
    SET user_name  = excluded.user_name,
        email      = excluded.email,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
RETURNING *;

-- name: GetUserByKiteID :one
SELECT * FROM users
WHERE kite_id = ?
LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = ?
LIMIT 1;
