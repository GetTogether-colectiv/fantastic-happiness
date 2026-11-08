CREATE TABLE chat_messages (id BIGSERIAL PRIMARY KEY,
                            event_id BIGINT NOT NULL,
                            user_id  BIGINT NOT NULL,
                            content  VARCHAR(1000) NOT NULL,
                            sent_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_event_id_sent_at ON chat_messages (event_id, sent_at DESC);


-- Demo messages in three upcoming events; every seeded user is GOING to them (03_participation.sql).
INSERT INTO chat_messages (event_id, user_id, content, sent_at)
SELECT e.id, v.user_id, v.content, now() - v.sent_ago
FROM (VALUES
          ('Morning Run in the Park', 6,'Hi everyone! We meet at the main entrance of Parcul Central.', INTERVAL '2 days 3 hours'),
          ('Morning Run in the Park', 1,'Great, see you there! What pace are we going for?',            INTERVAL '2 days 2 hours'),
          ('Morning Run in the Park', 6,'Easy pace, about 6 min/km. Nobody gets left behind.',          INTERVAL '2 days 1 hour'),
          ('Morning Run in the Park', 14,'Perfect for me. Is there somewhere to leave a bag?',           INTERVAL '1 day 5 hours'),
          ('Morning Run in the Park', 3,'I can stay with the bags, I am only walking this time.',       INTERVAL '1 day 4 hours'),
          ('Morning Run in the Park', 2,'Does anyone want coffee after the run?',                       INTERVAL '3 hours'),
          ('Board Games Night',9,  'Welcome! Feel free to bring your favourite game.',             INTERVAL '1 day 8 hours'),
          ('Board Games Night',4,  'I will bring Catan and Codenames.',                            INTERVAL '1 day 7 hours'),
          ('Board Games Night',12, 'Is anyone up for a long strategy game?',                       INTERVAL '1 day 2 hours'),
          ('Board Games Night',9,  'Yes, we can set up a separate table for that.',                INTERVAL '1 day 1 hour'),
          ('Board Games Night',7,  'Snacks are on me this time.',                                  INTERVAL '5 hours'),
          ('Cluj JS Meetup',6,  'Talks start at 18:00, doors open half an hour earlier.',       INTERVAL '2 days'),
          ('Cluj JS Meetup',8,'Will the talks be recorded?',                                  INTERVAL '1 day 6 hours'),
          ('Cluj JS Meetup', 6,'Yes, the recordings will be shared after the event.',          INTERVAL '1 day 5 hours'),
          ('Cluj JS Meetup',5,'Looking forward to the frontend talk!',                        INTERVAL '2 hours')
     ) AS v(title, user_id, content, sent_ago)
         JOIN events e ON e.title = v.title;