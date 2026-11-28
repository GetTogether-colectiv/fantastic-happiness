BEGIN;

CREATE TABLE IF NOT EXISTS post_comments (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT       NOT NULL REFERENCES posts ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL,
    text       VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments (post_id, created_at);

COMMIT;
