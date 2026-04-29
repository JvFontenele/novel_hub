CREATE TABLE scraper_settings (
    hostname    TEXT PRIMARY KEY,
    cookies     TEXT,
    user_agent  TEXT,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
