CREATE TABLE participations (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    event_id   BIGINT      NOT NULL,
    status     VARCHAR(20) NOT NULL CHECK (status IN ('GOING', 'NOT_INTERESTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

CREATE INDEX idx_participations_event_id ON participations (event_id);

-- Seed data: spreads attendees unevenly over the events, so counts differ from one event to the next.
INSERT INTO participations (event_id, user_id, status)
SELECT e.id, u.id, 'GOING'
FROM events e
         CROSS JOIN users u
WHERE (e.id + u.id) % 3 = 0
   OR (e.id * u.id) % 5 = 0;
