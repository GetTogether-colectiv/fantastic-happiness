BEGIN;

CREATE TABLE IF NOT EXISTS post_photos (
    id        BIGSERIAL    PRIMARY KEY,
    post_id   BIGINT       NOT NULL REFERENCES posts ON DELETE CASCADE,
    file_name VARCHAR(100) NOT NULL,
    position  SMALLINT     NOT NULL,
    UNIQUE (post_id, position)
);

COMMIT;
