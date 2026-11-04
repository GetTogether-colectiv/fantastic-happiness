CREATE TABLE attendances (
    id         BIGSERIAL PRIMARY KEY,
    event_id   BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_attendances_event_id ON attendances (event_id);

-- Seed data: spreads attendees unevenly over the events, so counts differ from one event to the next.
INSERT INTO attendances (event_id, user_id)
SELECT e.id, u.id
FROM events e
         CROSS JOIN users u
WHERE (e.id + u.id) % 3 = 0
   OR (e.id * u.id) % 5 = 0;
