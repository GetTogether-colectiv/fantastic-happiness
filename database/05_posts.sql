CREATE TABLE posts (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    event_id   BIGINT       NOT NULL,
    rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text       VARCHAR(1000),
    created_at TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (user_id, event_id)
);

CREATE TABLE post_photos (
    id        BIGSERIAL    PRIMARY KEY,
    post_id   BIGINT       NOT NULL REFERENCES posts ON DELETE CASCADE,
    file_name VARCHAR(100) NOT NULL,
    position  SMALLINT     NOT NULL,
    UNIQUE (post_id, position)
);

CREATE TABLE post_comments (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT       NOT NULL REFERENCES posts ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL,
    text       VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_post_comments_post_id ON post_comments (post_id, created_at);
