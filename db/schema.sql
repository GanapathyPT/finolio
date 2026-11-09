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

