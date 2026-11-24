BEGIN;

CREATE TABLE IF NOT EXISTS friendships
(
    id           BIGSERIAL PRIMARY KEY,
    requester_id BIGINT      NOT NULL,
    addressee_id BIGINT      NOT NULL,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON friendships (addressee_id);

COMMIT;
