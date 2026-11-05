CREATE TABLE participations (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    event_id   BIGINT      NOT NULL,
    status     VARCHAR(20) NOT NULL CHECK (status IN ('GOING', 'NOT_INTERESTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

CREATE INDEX idx_participations_event_id ON participations (event_id);

-- Every user attends four upcoming events and two past events (14 users x 6 events = 84 rows).
-- Six users also attend Pastry Masterclass, filling its capacity and bringing the total to 90.
INSERT INTO participations (event_id, user_id, status)
SELECT e.id, u.id, 'GOING'
FROM events e
         CROSS JOIN users u
WHERE e.title IN (
    'Indie Night at Form Space',
    'Morning Run in the Park',
    'Cluj JS Meetup',
    'Board Games Night',
    'Acoustic Sessions',
    'Book Swap'
)
   OR (e.title = 'Pastry Masterclass' AND u.id IN (2, 5, 8, 10, 11, 14))
ON CONFLICT (user_id, event_id) DO NOTHING;
