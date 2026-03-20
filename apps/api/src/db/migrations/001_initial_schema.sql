-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
CREATE TYPE novel_status AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS', 'DROPPED', 'UNKNOWN');
CREATE TYPE source_status AS ENUM ('MONITORING', 'PAUSED', 'FAILED', 'DEAD');
CREATE TYPE event_type   AS ENUM ('NEW_CHAPTER', 'STATUS_CHANGED', 'NOVEL_UPDATED', 'SOURCE_FAILED');
CREATE TYPE run_status   AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- USERS
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOVELS
CREATE TABLE novels (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                TEXT NOT NULL,
    cover_url            TEXT,
    synopsis             TEXT,
    author               TEXT,
    status               novel_status NOT NULL DEFAULT 'UNKNOWN',
    last_chapter_number  NUMERIC(10,2),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOVEL_SOURCES
CREATE TABLE novel_sources (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id              UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    url                   TEXT NOT NULL UNIQUE,
    canonical_url         TEXT,
    connector_key         TEXT NOT NULL,
    status                source_status NOT NULL DEFAULT 'MONITORING',
    monitoring_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    check_interval_min    INT NOT NULL DEFAULT 60,
    last_checked_at       TIMESTAMPTZ,
    next_check_at         TIMESTAMPTZ,
    consecutive_failures  INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_novel_sources_novel_id ON novel_sources(novel_id);
CREATE INDEX idx_novel_sources_next_check ON novel_sources(next_check_at)
    WHERE monitoring_enabled = TRUE AND status != 'DEAD';

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id                  UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    last_read_chapter_number  NUMERIC(10,2),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, novel_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_novel_id ON subscriptions(novel_id);

-- CHAPTERS
CREATE TABLE chapters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES novel_sources(id) ON DELETE CASCADE,
    novel_id        UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number  NUMERIC(10,2) NOT NULL,
    title           TEXT,
    url             TEXT NOT NULL,
    content_hash    TEXT NOT NULL,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_id, content_hash)
);

CREATE INDEX idx_chapters_novel_id_number ON chapters(novel_id, chapter_number DESC);
CREATE INDEX idx_chapters_source_id ON chapters(source_id);

-- EVENTS
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id    UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    source_id   UUID REFERENCES novel_sources(id) ON DELETE SET NULL,
    type        event_type NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_novel_id_created ON events(novel_id, created_at DESC);
CREATE INDEX idx_events_type ON events(type);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id    UUID REFERENCES novels(id) ON DELETE SET NULL,
    event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
    type        event_type NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- COLLECTOR_RUNS
CREATE TABLE collector_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES novel_sources(id) ON DELETE CASCADE,
    status          run_status NOT NULL,
    chapters_found  INT NOT NULL DEFAULT 0,
    chapters_new    INT NOT NULL DEFAULT 0,
    error_message   TEXT,
    duration_ms     INT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

CREATE INDEX idx_collector_runs_source_id ON collector_runs(source_id, started_at DESC);
CREATE INDEX idx_collector_runs_status ON collector_runs(status, started_at DESC);
