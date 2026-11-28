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
    position  SMALLINT     NOT NULL CHECK (position BETWEEN 0 AND 2),
    UNIQUE (post_id, position)
);
