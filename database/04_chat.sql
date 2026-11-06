CREATE TABLE chat_messages (id BIGSERIAL PRIMARY KEY,
                            event_id BIGINT NOT NULL,
                            user_id  BIGINT NOT NULL,
                            content  VARCHAR(1000) NOT NULL,
                            sent_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_event_id_sent_at ON chat_messages (event_id, sent_at DESC);