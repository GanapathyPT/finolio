-- name: UpsertKiteSession :one
INSERT INTO kite_sessions (user_id, access_token, public_token, login_time)
VALUES (?, ?, ?, ?)
ON CONFLICT (user_id) DO UPDATE
    SET access_token = excluded.access_token,
        public_token = excluded.public_token,
        login_time   = excluded.login_time,
        created_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
RETURNING *;

-- name: GetKiteSessionByUserID :one
SELECT * FROM kite_sessions
WHERE user_id = ?
LIMIT 1;

-- name: DeleteKiteSession :exec
DELETE FROM kite_sessions
WHERE user_id = ?;
