CREATE TABLE friendships
(
    id           BIGSERIAL PRIMARY KEY,
    requester_id BIGINT      NOT NULL,
    addressee_id BIGINT      NOT NULL,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX uq_friendships_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX idx_friendships_requester_id ON friendships (requester_id);
CREATE INDEX idx_friendships_addressee_id ON friendships (addressee_id);

-- User 1 has three friends, one incoming request (from user 5) and one sent request (to user 6).
-- Users 7 and 8 have no relation to user 1, so they can be added during manual testing.
-- Every other event organizer (users 2-14) has at least two friends.
INSERT INTO friendships (requester_id, addressee_id, status)
VALUES (1, 2, 'ACCEPTED'),
       (3, 1, 'ACCEPTED'),
       (1, 4, 'ACCEPTED'),
       (5, 1, 'PENDING'),
       (1, 6, 'PENDING'),
       (2, 3, 'ACCEPTED'),
       (2, 5, 'ACCEPTED'),
       (3, 4, 'ACCEPTED'),
       (4, 6, 'ACCEPTED'),
       (5, 6, 'ACCEPTED'),
       (6, 7, 'ACCEPTED'),
       (7, 8, 'ACCEPTED'),
       (8, 9, 'ACCEPTED'),
       (9, 10, 'ACCEPTED'),
       (10, 11, 'ACCEPTED'),
       (11, 12, 'ACCEPTED'),
       (12, 13, 'ACCEPTED'),
       (13, 14, 'ACCEPTED'),
       (14, 2, 'ACCEPTED'),
       (9, 11, 'ACCEPTED'),
       (3, 12, 'ACCEPTED'),
       (5, 10, 'ACCEPTED'),
       (9, 2, 'PENDING'),
       (12, 4, 'PENDING'),
       (14, 6, 'PENDING'),
       (10, 7, 'PENDING'),
       (13, 8, 'PENDING');
