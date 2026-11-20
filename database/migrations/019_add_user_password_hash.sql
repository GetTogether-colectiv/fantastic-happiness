BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100);

UPDATE users
SET password_hash = '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'
WHERE password_hash IS NULL
  AND email IN (
    'alexandra.pop@gettogether.test',
    'iulia.dragomir@gettogether.test',
    'alexandra.mihailovici@gettogether.test',
    'george.enescu@gettogether.test',
    'diana.printesa@gettogether.test',
    'david.pop@gettogether.test',
    'ion.creanga@gettogether.test',
    'ion.barbu@gettogether.test',
    'mircea.cartarescu@gettogether.test',
    'maria.ionescu@gettogether.test',
    'radu.dumitru@gettogether.test',
    'elena.stan@gettogether.test',
    'vlad.munteanu@gettogether.test',
    'ioana.radu@gettogether.test'
  );

-- Legacy accounts outside the demo list get random credentials that no one knows.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE users
SET password_hash = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf', 10))
WHERE password_hash IS NULL;

ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

COMMIT;
